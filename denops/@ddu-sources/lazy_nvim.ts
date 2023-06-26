import type { GatherArguments } from "https://deno.land/x/ddu_vim@v3.2.7/base/source.ts";
import type { ActionData as FileActionData } from "https://deno.land/x/ddu_kind_file@v0.5.1/file.ts";

import {
  ActionFlags,
  Actions,
  BaseSource,
  Item,
} from "https://deno.land/x/ddu_vim@v3.2.7/types.ts";
import { TextLineStream } from "https://deno.land/std@0.192.0/streams/text_line_stream.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.2.7/deps.ts";
import { join } from "https://deno.land/std@0.192.0/path/mod.ts";

type ActionData = FileActionData & LazyPlugin;

type Params = Record<never, never>;

type LazyPlugin = {
  name: string;
  path: string;
  url?: string;
  spec?: string;
  lazy?: boolean;
};

async function err(denops: Denops, msg: string) {
  await denops.call("ddu#util#print_error", msg, "ddu-source-lazy_nvim");
}

export class ErrorStream extends WritableStream<string> {
  constructor(denops: Denops) {
    super({
      write: async (chunk, _controller) => {
        await err(denops, chunk);
      },
    });
  }
}

export class Source extends BaseSource<Params, ActionData> {
  override kind = "file";

  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        controller.enqueue(
          await args.denops.call(
            "ddu#sources#lazy_nvim#plugins_action_data",
          ) as Item<ActionData>[],
        );
      },
    });
  }

  #call_gh = async (denops: Denops, args: string[]) => {
    const { status, stderr } = new Deno.Command("gh", { args, stderr: "piped" })
      .spawn();
    const stat = await status;
    if (!stat.success) {
      await stderr
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .pipeTo(new ErrorStream(denops));
    }
  };

  override actions = {
    grep_config: async ({ denops, items }) => {
      if (items.length != 1) {
        await err(denops, "Multiple selected items are not supported");
        return ActionFlags.RestoreCursor;
      }
      const spec = (items[0].action as ActionData).spec;
      const config_path = await fn.call(denops, "stdpath", ["config"]);
      if (!spec) {
        await err(denops, "Selected item does not have a spe");
        return ActionFlags.RestoreCursor;
      }
      await fn.execute(denops, `grep ${spec} ${config_path}`);
      return ActionFlags.None;
    },

    fork: async ({ denops, items }) => {
      if (items.length != 1) {
        await err(denops, "Multiple selected items are not supported");
        return ActionFlags.RestoreCursor;
      }
      const selection = items[0];
      const act = selection.action as ActionData;

      if (!act.url) {
        await err(denops, "invalid item: having no URL");
        return ActionFlags.RestoreCursor;
      }

      // get the path of lazy.nvim dev directory
      const devdir = join(
        await fn.call(denops, "ddu#sources#lazy_nvim#devdir", []) as string,
        act.name,
      );

      try {
        // call gh repo fork
        await this.#call_gh(denops, ["repo", "fork", act.url]);

        // call gh repo clone
        await this.#call_gh(denops, ["repo", "clone", act.url, "--", devdir]);
      } catch {
        err(denops, "failed to call gh");
      }
      return Promise.resolve(ActionFlags.None);
    },
  } as Actions<Params>;

  override params(): Params {
    return {};
  }
}
