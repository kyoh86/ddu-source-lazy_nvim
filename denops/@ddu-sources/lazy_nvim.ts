import type { GatherArguments } from "https://deno.land/x/ddu_vim@v4.0.0/base/source.ts";
import type { ActionData as FileActionData } from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";
import type {
  Actions,
  DduItem,
  Item,
} from "https://deno.land/x/ddu_vim@v4.0.0/types.ts";

import {
  ActionFlags,
  BaseSource,
} from "https://deno.land/x/ddu_vim@v4.0.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v4.0.0/deps.ts";
import { echomsg } from "https://denopkg.com/kyoh86/denops-util@v0.0.7/echomsg.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.18.0/mod.ts";

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

async function fork(denops: Denops, items: DduItem[], clone: boolean) {
  await denops.call(
    "denops#notify",
    "ddu-kind-lazy_nvim_plugin",
    "fork",
    [
      items.map((item) => item.action as ActionData),
      clone,
    ],
  );
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
    browse: async (
      { denops, items, actionParams },
    ) => {
      const params = ensure(actionParams, is.Record);
      const opener = maybe(params.opener, is.String);
      const targets = items.map((item) => item?.action as ActionData);
      await denops.call(
        "denops#notify",
        "ddu-kind-lazy_nvim_plugin",
        "open",
        [
          targets,
          opener,
        ],
      );
      return ActionFlags.None;
    },

    grep_config: async ({ denops, items }) => {
      const item = await ensureOnlyOneItem(denops, items);
      if (!item) {
        return ActionFlags.Persist;
      }
      const spec = (item.action as ActionData).spec;
      const config_path = await fn.call(denops, "stdpath", ["config"]);
      if (!spec) {
        await echomsg(denops, "Selected item does not have a spe", "ErrorMsg");
        return ActionFlags.RestoreCursor;
      }
      await fn.execute(denops, `grep ${spec} ${config_path}`);
      return ActionFlags.None;
    },

    clone: async ({ denops, items }) => {
      return await fork(denops, items, true);
    },

    fork: async ({ denops, items }) => {
      return await fork(denops, items, false);
    },

    help: async ({ denops, items }) => {
      const item = await ensureOnlyOneItem(denops, items);
      if (!item) {
        return ActionFlags.Persist;
      }
      const name = (item.action as ActionData).name.replace(
        /^vim-|\.n?vim$/,
        "",
      );
      await denops.cmd(`help ${name}.txt`).catch((reason) => {
        if (/[EW]\d+: .+$/.test(reason.toString())) {
          console.error(reason.toString().replace(/^.*([EW]\d+: )/, "$1"));
        } else {
          console.error(reason);
        }
      });
      return ActionFlags.None;
    },
  } as Actions<Params>;

  override params(): Params {
    return {};
  }
}
