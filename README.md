# SSCA (super seyfert cache adapter)
> Custom cache adapter for Seyfert.

## Installation
```bash
bun add ssca
```

or pnpm...
```bash
pnpm add ssca
```

## Usage
```ts
import { Client } from "seyfert";
import { SSCAdapter } from "ssca";

const seyfertClient = new Client(); // Create your client.

seyfertClient.setServices({
    cache: {
        adapter: new SSCAdapter()
    }
})

// That's it! Now you can use Seyfert with your new upgraded cache adapter!
```

## Contributing
I appreciate contributions a lot, you are welcome to do so! 🥰