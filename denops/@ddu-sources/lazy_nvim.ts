import type { GatherArguments } from "https://deno.land/x/ddu_vim@v3.6.0/base/source.ts";
import type { ActionData as FileActionData } from "https://deno.land/x/ddu_kind_file@v0.5.3/file.ts";
import type {
  Actions,
  DduItem,
  Item,
} from "https://deno.land/x/ddu_vim@v3.6.0/types.ts";

import {
  ActionFlags,
  BaseSource,
} from "https://deno.land/x/ddu_vim@v3.6.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.6.0/deps.ts";
import { join } from "https://deno.land/std@0.200.0/path/mod.ts";
import { echoerr, pipe } from "../ddu-source-lazy_nvim/message.ts";

type ActionData = FileActionData & LazyPlugin;

type Params = Record<string, never>;

type LazyPlugin = {
  name: string;
  path: string;
  url?: string;
  spec?: string;
  lazy?: boolean;
};

async function ensureOnlyOneItem(denops: Denops, items: DduItem[]) {
  if (items.length != 1) {
    await denops.call(
      "ddu#util#print_error",
      "invalid action calling: it can accept only one item",
      "ddu-source-lazy_nvim",
    );
    return;
  }
  return items[0];
}

async function clone(denops: Denops, items: DduItem[], fork: boolean) {
  for await (const item of items) {
    const act = item.action as ActionData;

    if (!act.url) {
      await echoerr(denops, "invalid item: having no URL");
      return ActionFlags.RestoreCursor;
    }

    // get the path of lazy.nvim dev directory
    const devdir = join(
      await fn.call(denops, "ddu#sources#lazy_nvim#devdir", []) as string,
      act.name,
    );

    try {
      // call gh repo fork
      await pipe(denops, "gh", { args: ["repo", "fork", act.url] });
    } catch {
      echoerr(denops, "failed to call gh fork");
    }

    if (fork) {
      try {
        // call gh repo clone
        await pipe(denops, "gh", {
          args: ["repo", "clone", act.url, "--", devdir],
        });
      } catch {
        echoerr(denops, "failed to call gh clone");
      }
    }
  }
  return ActionFlags.None;
}

export class Source extends BaseSource<Params, ActionData> {
  override kind = "file";

  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            await args.denops.call(
              "ddu#sources#lazy_nvim#plugins_action_data",
            ) as Item<ActionData>[],
          );
        } finally {
          controller.close();
        }
      },
    });
  }

  override actions = {
    grep_config: async ({ denops, items }) => {
      const item = await ensureOnlyOneItem(denops, items);
      if (!item) {
        return ActionFlags.Persist;
      }
      const spec = (item.action as ActionData).spec;
      const config_path = await fn.call(denops, "stdpath", ["config"]);
      if (!spec) {
        await echoerr(denops, "Selected item does not have a spe");
        return ActionFlags.RestoreCursor;
      }
      await fn.execute(denops, `grep ${spec} ${config_path}`);
      return ActionFlags.None;
    },

    clone: async ({ denops, items }) => {
      return await clone(denops, items, false);
    },

    fork: async ({ denops, items }) => {
      return await clone(denops, items, true);
    },
  } as Actions<Params>;

  override params(): Params {
    return {};
  }
}
