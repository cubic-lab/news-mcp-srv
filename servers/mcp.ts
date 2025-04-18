import "jsr:@std/dotenv/load";
import { Server } from "npm:@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "npm:@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { createClient } from "jsr:@supabase/supabase-js"
import { Logger } from "jsr:@deno-library/logger";
import z from "npm:zod";
import { parseMessageToJson } from "../libs/utils.ts";
import prompts from "../libs/prompts.ts"
import { CollectFromLinkSchema, NewsSchema } from "../libs/schemas.ts";

const READER_API_BASE = "https://r.jina.ai";
const logger = new Logger();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_KEY') || '',
);

const mcpServer = new Server({
  name: "news-mcp-srv",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

mcpServer.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: "collect-from-link",
        description: "从链接中收集信息，生成科技周报文案",
        inputSchema: zodToJsonSchema(CollectFromLinkSchema),
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "collect-from-link": {
        const { link } = CollectFromLinkSchema.parse(args);
        logger.info(`start to crawl link: ${link}`);
        const text = await fetch(`${READER_API_BASE}/${link}`).then(res => res.text());
        logger.info('text content fetched');
        const samplingResult = await mcpServer.createMessage({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `新闻原文：\n${text}`,
              },
            },
          ],
          systemPrompt: prompts.TECH_NEWS_EDITOR,
          maxTokens: 700,
        });
        // for validate
        logger.info('start to convert text as news')
        const news = NewsSchema.parse(
          parseMessageToJson(samplingResult.content.text as string)
        );

        const { data, error } = await supabase
          .from("news")
          .insert([
            {
              url: news.url,
              title: news.title,
              content: news.content,
              draft: true,
              tags: news.tags,
            },
          ])
          .select()
          .single();
          logger.info('task finished');
        if (error) {
          throw new Error(JSON.stringify(error));
        }
        return {
          content: [
            {
              type: "text",
              text: "已将该链接收集为以下记录。",
            },
            {
              type: "resource",
              resource: {
                uri: `news://${data.id}`,
                mimeType: "application/json",
                text: JSON.stringify(data),
              },
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
});

export { mcpServer };