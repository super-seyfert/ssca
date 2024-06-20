import { describe, expect, test } from "bun:test";
import { SSCAdapter } from "../src/lib/adapter";
import memoryDriver from "unstorage/drivers/memory";
import { Cache, type User } from "seyfert";

const adapter = new SSCAdapter();
const cache = new Cache(1, adapter);

const testUser = {
	name: "simxnet",
	id: "1076700780175831100",
};

const testUsers = [
	{
		name: "simxnet",
		id: "1076700780175831100",
	},
	{
		name: "marcrock22",
		id: "507367752391196682",
	},
];

describe("Add user and then get it", () => {
	test("add", async () => {
		await cache.users?.set("1076700780175831100", testUser);

		const cachedUser = cache.users?.get(testUser.id);
		expect(cachedUser).toStrictEqual(testUser as User);
	});
});

describe("Get cache values", () => {
	test("add", async () => {
		for (const user of testUsers) {
			await cache.users?.set(user.id, user);
		}

		const cachedUsers = await cache.users?.values();

		expect(cachedUsers).toStrictEqual(testUsers as User[]);
	});
});

// Big note: This test is only for coverage purposes, the real adapter should not be used this way as it is made for Seyfert internal managements.
