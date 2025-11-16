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
  // Match markdown tables anywhere in the text
  // A table consists of:
  // 1. Header row with pipes (can appear after any content)
  // 2. Separator row with dashes and pipes
  // 3. One or more data rows with pipes
  // The pattern matches from the start of a line with pipes through all consecutive pipe rows
  const tableRegex = /(^|\n)(\|.+\|\r?\n)+/gm;

  return text.replace(tableRegex, (match, leadingNewline) => {
    // Check if this looks like a table (has separator row with dashes)
    if (/\|[\s:-]+\|/.test(match)) {
      return leadingNewline + '[table]\n';
    }
    // If no separator row, keep original (might be false positive)
    return match;
  });
};
