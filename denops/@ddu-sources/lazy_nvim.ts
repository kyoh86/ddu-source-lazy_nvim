import type { GatherArguments } from "https://deno.land/x/ddu_vim@v3.0.0/base/source.ts";
import type { ActionData as FileActionData } from "https://deno.land/x/ddu_kind_file@v0.5.0/file.ts";

import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v3.0.0/types.ts";

type ActionData = FileActionData & LazyPlugin;

type Params = Record<never, never>;

type LazyPlugin = {
  name: string;
  path: string;
  url?: string;
  lazy?: boolean;
};

export class Source extends BaseSource<Params, ActionData> {
  override kind = "file";

  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const plugins = await args.denops.call(
          "ddu#sources#lazy_nvim#plugins",
        ) as LazyPlugin[];
        controller.enqueue(plugins.map((plugin) => {
          return {
            word: plugin.name,
            action: {
              name: plugin.name,
              path: plugin.path,
              isDirectory: true,
              url: plugin.url,
            },
            treePath: plugin.path,
            isTree: true,
          };
        }));
      },
    });
  }

  override params(): Params {
    return {};
  }
}
