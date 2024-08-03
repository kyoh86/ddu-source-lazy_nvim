import type { Denops } from "jsr:@denops/std@~7.0.1";
import * as fn from "jsr:@denops/std@~7.0.1/function";
import { ensure, is, maybe } from "jsr:@core/unknownutil@~3.18.1";
import { join } from "jsr:@std/path@~1.0.2";
import { systemopen } from "jsr:@lambdalisue/systemopen@~1.0.0";
import { echomsg } from "jsr:@kyoh86/denops-util@~0.1.0/echomsg";
import { echoallCommand } from "jsr:@kyoh86/denops-util@~0.1.0/command";

export function main(denops: Denops) {
  denops.dispatcher = {
    async fork(uTargets: unknown, uClone?: unknown) {
      const targets = ensure(
        uTargets,
        is.ArrayOf(is.ObjectOf({
          name: is.String,
          url: is.OptionalOf(is.String),
        })),
      );
      const clone = ensure(uClone, is.Boolean);

      // get the path of lazy.nvim dev directory
      const devdir = await fn.call(
        denops,
        "ddu#sources#lazy_nvim#devdir",
        [],
      ) as string;
      for await (const target of targets) {
        if (!target.url) {
          continue;
        }
        const args = ["repo", "fork", target.url];
        if (clone) {
          args.push("--clone", "--", join(devdir, target.name));
        }

        try {
          // call gh repo fork
          await echoallCommand(denops, "gh", { args: args });
        } catch {
          echomsg(denops, "failed to call gh fork", "ErrorMsg");
        }
      }
    },

    async open(uTargets: unknown, uOpener?: unknown) {
      const targets = ensure(
        uTargets,
        is.ArrayOf(is.ObjectOf({
          name: is.String,
          url: is.OptionalOf(is.String),
        })),
      );
      const opener = maybe(uOpener, is.String);
      for (const target of targets) {
        if (!target.url) {
          continue;
        }
        if (opener) {
          const command = new Deno.Command(opener, {
            args: [target.url],
            stdin: "null",
            stdout: "null",
            stderr: "null",
          });
          const proc = command.spawn();
          await proc.status;
        } else {
          await systemopen(target.url);
        }
      }
    },
  };
}
