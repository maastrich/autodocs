export const models = {
  "gpt-3.5-turbo": {
    price: {
      prompt: 0.001,
      response: 0.02,
    },
    maxTokens: 4000,
    isChatModel: true,
  },
  "gpt-4": {
    price: {
      prompt: 0.03,
      response: 0.06,
    },
    maxTokens: 8000,
    isChatModel: true,
  },
  "gpt-4-0314": {
    price: {
      prompt: 0.03,
      response: 0.06,
    },
    maxTokens: 8000,
    isChatModel: true,
  },
  "gpt-4-32k": {
    price: {
      prompt: 0.06,
      response: 0.12,
    },
    maxTokens: 32000,
    isChatModel: true,
  },
  "gpt-4-32k-0314": {
    price: {
      prompt: 0.06,
      response: 0.12,
    },
    maxTokens: 32000,
    isChatModel: true,
  },
};
