import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.0/function/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { systemopen } from "https://deno.land/x/systemopen@v1.0.0/mod.ts";
import { echomsg } from "https://denopkg.com/kyoh86/denops-util@master/echomsg.ts";
import { echoallCommand } from "https://denopkg.com/kyoh86/denops-util@master/command.ts";

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
