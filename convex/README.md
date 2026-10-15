# Welcome to your Convex functions directory!

## Finding account-linked and anonymous annotations

In the Convex dashboard for `precious-fish-294`, open **Data → workspaces** or **Data → segments** and filter `accountType`:

- `registered`: the workspace is linked to an account that currently exists.
- `anonymous`: the workspace has no account ID. This does not prove whether a person or a test created its annotations.
- `test`: the workspace was explicitly identified in a test-account audit.
- `unknown`: the workspace or its linked account record is missing; preserve these records for further review.

These fields describe workspace ownership, not the identity of the person who created a particular annotation. Segments also carry `workspaceId` for direct matching. Existing labels, timestamps, reviews, exports and permissions are unchanged. New saves are grouped automatically, and linking an anonymous workspace to an account refreshes its segment groups in background batches.

The 16 October 2026 maintenance removes only the 80 explicitly audited test segments after a private backup and ownership/sharing checks. It preserves all other annotations and all video, project and account records. The temporary deletion function is removed after verification; no public cleanup endpoint is retained.

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

A query function that takes two arguments looks like:

```ts
// convex/myFunctions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.myFunctions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get("messages", id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.myFunctions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.
