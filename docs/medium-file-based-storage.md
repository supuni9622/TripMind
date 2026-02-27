# File-Based Storage: When to Use It, When to Move On

*A practical take on skipping the database and storing app data as files—and when that stops being enough.*

---

You’re building a small app. You need to persist some data: user-created content, uploads, maybe a search index. The obvious choice for many is a database: PostgreSQL, MongoDB, or a managed service. But there’s another option that often gets overlooked: **store everything as files**.

Not as a hack—as a deliberate, simple design. One folder for “entities,” one JSON file per record, and subfolders for blobs. No DB server, no migrations, no connection strings. For the right kind of product, that’s enough—and sometimes better.

Here’s when file-based storage helps, where it hurts, and how to think about scaling and concurrency without writing a single line of code.

---

## What “file-based storage” really means

You’re not “just writing to disk” in a random way. You’re choosing a **structure**: for example, one directory per entity type (e.g. “trips”), one file per entity (e.g. `{id}.json`), and one directory per entity for related blobs (e.g. uploads, generated assets). Metadata lives in JSON; binary or large assets live as normal files. The app reads and writes these files through the filesystem API. No database process, no schema migrations—just files and folders.

That’s it. The mental model is: *one thing = one file (or one folder of files)*. Backing up is “copy this folder.” Inspecting data is “open this file.” Deploying is “run the app and point it at a directory.”

---

## Why it’s attractive

**Simplicity.** You don’t provision a database, manage credentials, or run migrations. You don’t think about connection pools or timeouts. You think in terms of “read this file” and “write this file.” That’s easier to reason about and to onboard others onto.

**Portability.** Data is just files. You can copy the data directory to another machine, sync it, or put it in version control (excluding large binaries). Restore is “put the folder back.” No dump/restore tools, no DB-specific backup formats.

**Transparency.** You can open a JSON file and see exactly what’s stored. Debugging and ad-hoc fixes don’t require DB clients or query languages. Non-developers can sometimes inspect or even edit data with standard tools.

**Low operational footprint.** There’s no separate database to monitor, patch, or scale. For a single-instance app (one server, one process), the only moving part is your application. That’s a real advantage for side projects, internal tools, or early-stage products.

**Good fit for “one thing per user” or “few entities.”** If the product is “each user has one workspace” or “each user has one active trip,” the number of entities stays bounded. File count stays manageable, and listing “all” is just listing a directory. You’re not trying to replace a relational store for millions of rows.

---

## Where it falls short

**Concurrency.** The filesystem doesn’t serialize writers for you. If two requests both read the same file, both modify it, and both write it back, the last write wins—and the first update is lost. So you need **application-level serialization**: only one “read → modify → write” at a time per entity. That can be an in-memory lock per entity (fine for one process) or a file-based lock (works across processes on the same machine). Without that, you’re accepting the risk of lost updates.

**No transactions.** You can’t atomically “update trip and index and delete old file” in one step. If one step fails, you may need cleanup or recovery logic. You’re trading simplicity for stronger consistency guarantees.

**Scaling and querying.** Listing “all entities” means reading directory contents and, if you need details, opening each file. There are no indexes, no “find by other field” without scanning. That’s fine when the number of entities is small (hundreds or low thousands) and access is “by ID.” It’s not fine when you need complex queries or high throughput.

**Single-machine and single-process assumptions.** The data lives on one disk. If you run multiple app instances (e.g. behind a load balancer), they don’t share that filesystem unless you introduce something like a shared volume or network storage. And in-memory locks don’t help across processes—you’d need file-based or external locking (e.g. Redis). So file-based storage fits “one server, one process” or “one server, multiple processes with a shared disk and file locks” much better than “many servers, no shared disk.”

**Serverless.** In serverless (e.g. AWS Lambda, Vercel), the filesystem is usually ephemeral. Anything you write disappears between invocations. So file-based storage only works if you’re writing to a persistent volume or an external store (e.g. S3). The *model* (one file per entity) can carry over to object storage; the *implementation* can’t assume a local disk.

---

## What about using S3 (or object storage) instead of the local disk?

Object storage (S3, or S3-compatible) changes the *where*, not the *how* of concurrency.

**What S3 gives you:** Durability, availability, and the ability to scale to huge numbers of objects. No single disk to fill or fail. Multiple app instances (or serverless) can all read and write the same bucket. So you can run many servers or functions and still have one logical “file store.” That’s a big step up from “one server’s disk.”

**What S3 does *not* fix:** Read–modify–write races. You still GET an object, change it in your app, and PUT it back. Two concurrent requests can still do that and overwrite each other. So you still need a strategy: **locking** (e.g. a distributed lock per entity in Redis or DynamoDB) or **optimistic concurrency** (e.g. store a version or ETag, and only PUT if it hasn’t changed; otherwise retry). S3 is great for scaling and durability; concurrency safety is something you add in the application layer.

So: moving from local files to S3 is helpful for production, multi-instance, and serverless. It doesn’t remove the need to think about serialization and consistency.

---

## Is it “okay” for production?

It depends what you mean by production.

**Single server, one process (or multiple processes with a shared disk and file-based locking), moderate traffic:** Yes. Hundreds or low thousands of users, with tens or low hundreds of concurrent requests, are typically fine. The disk (especially SSD) can handle the load; the main requirement is that you **do** serialize writes per entity (e.g. with a lock) so you don’t lose updates.

**Multiple servers, no shared filesystem:** Not without changing the storage. You’d need a shared store (e.g. S3) and a locking or versioning strategy.

**High availability (no single point of failure):** File-based storage is tied to that server or that disk. For HA you’d replicate the data (e.g. backups, or a shared store like S3) and accept that the “primary” is still a single place. A database or managed service often gives you replication and failover out of the box.

**Summary:** File-based storage can be production-appropriate for a single-instance or small-scale deployment where you’re okay with “one server, good backups, and best-effort durability.” It’s not a fit when you need horizontal scaling, serverless, or high availability without extra design work.

---

## When to move on

Consider introducing a database (or a more capable store) when:

- You run **multiple app instances** and don’t want to rely on shared volumes and file locking.
- You need **transactions** (e.g. “create trip and index atomically”).
- You need **richer querying** (filtering, sorting, searching by many fields) over larger datasets.
- You need **high availability** (failover, replication) and don’t want to build it yourself.
- **Traffic** grows to the point where “open every file” or “list directory + read many files” becomes a bottleneck.

That doesn’t mean you throw away the file idea everywhere. You might keep **files (or objects) for blobs** (uploads, generated assets) and put **metadata and relations** in a database. The “one file per entity” idea can also carry over to object storage (one object per entity) once you add concurrency control.

---

## Conclusion

File-based storage is a valid architectural choice: simple, portable, and easy to reason about. It fits side projects, internal tools, and early-stage products where the scale is modest and you want minimal moving parts. The main pitfalls are **concurrency** (solve it with per-entity locking or versioning) and **scale** (one machine, one process, or shared storage + locking). Once you need multiple instances, serverless, or stronger consistency and querying, it’s time to layer in a database or a shared store—often while keeping the “files for blobs” part of the design.

Understanding these trade-offs lets you choose file-based storage deliberately when it fits—and move on when it doesn’t—without treating it as a temporary hack or a one-size-fits-all solution.
