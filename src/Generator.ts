import { OpenAI } from "openai";

import { Config } from "./utils/config.js";
import { models } from "./utils/models.js";

export class Generator {
  private completions = new Array<OpenAI.Chat.Completions.ChatCompletion>();
  private openai: OpenAI;
  constructor(private config: Config["openai"]) {
    this.openai = new OpenAI({
      apiKey: config.apiKey ?? undefined,
    });
  }
  public async generate({
    stop,
    messages = [],
  }: { stop?: string[]; messages?: Array<string> } = {}) {
    const completion = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: this.config.prompt,
        },
        ...messages.map((message) => ({
          role: "user" as const,
          content: message,
        })),
      ],
      max_tokens: this.config.maxTokens,
      stop,
    });
    this.completions.push(completion);
    const { choices } = completion;
    if (!choices) {
      throw new Error("No completion");
    }
    return (
      choices[0].message.content?.trim().split("\n") ?? new Array<string>()
    );
  }

  public getComsumption() {
    const cost =
      this.completions.reduce((acc, completion) => {
        const { prompt_tokens = 0, completion_tokens = 0 } =
          completion.usage ?? {};
        const model = models[this.config.model];
        return (
          acc +
          model.price.prompt * prompt_tokens +
          model.price.response * completion_tokens
        );
      }, 0) / 1000;
    const { prompt_tokens, completion_tokens } = this.completions.reduce(
      (acc, completion) => {
        const { prompt_tokens = 0, completion_tokens = 0 } =
          completion.usage ?? {};
        return {
          prompt_tokens: acc.prompt_tokens + prompt_tokens,
          completion_tokens: acc.completion_tokens + completion_tokens,
        };
      },
      {
        prompt_tokens: 0,
        completion_tokens: 0,
      },
    );
    return {
      cost,
      prompt_tokens,
      completion_tokens,
      completions: this.completions.length,
    };
  }
}
