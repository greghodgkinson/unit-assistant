import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
});

export const renderMarkdown = (text: string): string => {
  return md.render(text);
};

export const replaceTablesWithPlaceholder = (text: string): string => {
  // Match markdown tables (lines starting with |)
  // A table consists of:
  // 1. Header row with pipes
  // 2. Separator row with dashes and pipes
  // 3. Data rows with pipes
  const tableRegex = /^\|.+\|[\r\n]+\|[\s:-]+\|[\r\n]+((?:\|.+\|[\r\n]*)+)/gm;

  return text.replace(tableRegex, '[table]');
};
