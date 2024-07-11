import type { Adapter } from "seyfert";
import {
	createStorage,
	prefixStorage,
	type Storage,
	type StorageValue,
} from "unstorage";
import { version as seyfertVersion } from "seyfert/package.json";

/**
 * Super Seyfert Cache Adapter
 *
 * Minimal cache adapter on top of Unstorage.
 * @see [Unstorage docs](https://unstorage.unjs.io/)
 * @todo Implement generic types
 *
 * @returns `CacheAdapter`
 */
export class CacheAdapter implements Adapter {
	/**
	 * This adapter is asynchronous
	 */
	isAsync = true;

	readonly __storage: Storage<StorageValue>;
	public storage: Storage<string>;
	public relationships: Storage<string[]>;

	/**
	 *
	 * @param storage Your custom storage instance (from Unstorage)
	 * @default Storage<StorageValue>
	 */
	constructor(storage?: Storage<StorageValue>) {
		if (!seyfertVersion.includes("github"))
			throw new Error("Please use Seyfert v2 or higher.");

		this.__storage = storage ?? createStorage();
		this.storage = prefixStorage<string>(this.__storage, "seyfert");
		this.relationships = prefixStorage<string[]>(
			this.__storage,
			"seyfert:relationships",
		);
	}

	async bulkGet(keys: string[]) {
		return (
			await Promise.all(
				keys.map(async (x) => {
					const data = await this.storage.getItem(x);
					return data ? JSON.parse(data) : null;
				}),
			)
		).filter((x) => x);
	}

	async bulkSet(keys: [string, unknown][]) {
		for (const [key, value] of keys) {
			this.storage.setItem(key, JSON.stringify(value));
		}
	}

	async bulkRemove(keys: string[]) {
		for (const i of keys) {
			this.storage.removeItem(i);
		}
	}

	async scan(query: string, keys?: false): Promise<unknown[]>;
	async scan(query: string, keys: true): Promise<string[]>;
	async scan(query: string, keys = false) {
		const values = [];
		const sq = query.split(".");
		for (const key of await this.storage.getKeys()) {
			const value = await this.storage.getItem(key);
			if (
				key
					.split(".")
					.every((value, i) => (sq[i] === "*" ? !!value : sq[i] === value))
			) {
				values.push(keys ? key : JSON.parse(value as string));
			}
		}

		return values;
	}

	async get<T>(keys: string): Promise<T>;
	async get<T>(keys: string[]): Promise<T[]>;
	async get(keys: string | string[]) {
		if (!Array.isArray(keys)) {
			const data = await this.storage.getItem(keys);
			return data ? (typeof data === "object" ? data : JSON.parse(data)) : null;
		}
		return (await Promise.all(keys.map((x) => this.storage.getItem(x))))
			.map((data) => {
				return data
					? typeof data === "object"
						? data
						: JSON.parse(data)
					: null;
			})
			.filter((x) => x);
	}

	async set(keys: string, data: unknown): Promise<void>;
	async set(keys: [string, unknown][]): Promise<void>;
	async set(keys: string | [string, unknown][], data?: unknown): Promise<void> {
		if (Array.isArray(keys)) {
			for (const [key, value] of keys) {
				await this.storage.setItem(key, JSON.stringify(value));
			}
		} else {
			await this.storage.setItem(keys, JSON.stringify(data));
		}
	}

	async bulkPatch(
		updateOnly: boolean,
		// biome-ignore lint/suspicious/noExplicitAny: hacked by marcrock22
		keys: [string, any][],
	): Promise<void> {
		for (const [key, value] of keys) {
			const oldData = this.get(key);
			if (updateOnly && !oldData) {
				continue;
			}

			await this.storage.setItem(
				key,
				Array.isArray(value)
					? JSON.stringify(value)
					: JSON.stringify({ ...(oldData ?? {}), ...value }),
			);
		}
	}

	async patch(
		updateOnly: boolean,
		keys: string,
		data?: Record<string, unknown>,
	): Promise<void> {
		const oldData = this.get(keys);
		if (updateOnly && !oldData) {
			return;
		}

		this.storage.setItem(
			keys,
			Array.isArray(data)
				? JSON.stringify(data)
				: JSON.stringify({ ...(oldData ?? {}), ...data }),
		);
	}

	async values<T>(to: string): Promise<T[]> {
		const array: T[] = [];
		const data = await this.keys(to);

		for (const key of data) {
			const content = await this.get<T>(key);

			if (content) {
				array.push(content);
			}
		}

		return array;
	}

	async keys(to: string) {
		return (await this.getToRelationship(to)).map((id) => `${to}.${id}`);
	}

	async count(to: string) {
		return (await this.getToRelationship(to)).length;
	}

	async remove(keys: string): Promise<void>;
	async remove(keys: string[]): Promise<void>;
	async remove(keys: string | string[]) {
		for (const i of Array.isArray(keys) ? keys : [keys]) {
			await this.storage.removeItem(i);
		}
	}

	async flush(): Promise<void> {
		await this.storage.clear();
		await this.relationships.clear();
	}

	async contains(to: string, keys: string): Promise<boolean> {
		return (await this.getToRelationship(to)).includes(keys);
	}

	async getToRelationship(to: string): Promise<string[]> {
		return (await this.relationships.getItem(to)) || [];
	}

	async bulkAddToRelationShip(data: Record<string, string[]>) {
		for (const i in data) {
			await this.addToRelationship(i, data[i]);
		}
	}

	async addToRelationship(to: string, keys: string | string[]) {
		if (!(await this.relationships.hasItem(to))) {
			await this.relationships.setItem(to, []);
		}

		const data = await this.getToRelationship(to);

		for (const key of Array.isArray(keys) ? keys : [keys]) {
			if (!data.includes(key)) {
				data.push(key);
			}
		}
	}

	async removeToRelationship(to: string, keys: string | string[]) {
		const data = await this.getToRelationship(to);
		if (data) {
			for (const key of Array.isArray(keys) ? keys : [keys]) {
				const idx = data.indexOf(key);
				if (idx !== -1) {
					data.splice(idx, 1);
				}
			}
		}
		await this.relationships.setItem(to, data);
	}

	async removeRelationship(to: string | string[]) {
		for (const i of Array.isArray(to) ? to : [to]) {
			await this.relationships.removeItem(i);
		}
	}
}
