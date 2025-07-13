import { StudentAnswer, TaskItem, AcceptanceCriteria } from '../types/Unit';

export const generateFeedback = (answer: StudentAnswer, task: TaskItem): string => {
  if (!answer.content || answer.content.trim().length < 50) {
    return "Your answer needs more detail. Try to provide specific examples and explain your reasoning more thoroughly.";
  }

  const content = answer.content.toLowerCase();
  const taskId = task.id;

  // Task-specific feedback logic
  if (taskId.startsWith('1.1')) {
    const hasBusinessName = /\b(company|business|organisation|organization)\b/.test(content);
    const hasStakeholders = /\b(stakeholder|shareholder|employee|customer|supplier)\b/.test(content);
    const hasConflicts = /\b(conflict|disagree|oppose|tension)\b/.test(content);
    
    if (!hasBusinessName) {
      return "Remember to name a specific profit-making business for your analysis.";
    }
    if (!hasStakeholders) {
      return "Include more detail about different stakeholder groups (internal and external).";
    }
    if (!hasConflicts) {
      return "Explain potential conflicts between stakeholder interests with specific examples.";
    }
  }

  if (taskId.startsWith('1.2')) {
    const hasNonProfit = /\b(non-profit|nonprofit|charity|foundation|ngo)\b/.test(content);
    const hasDifference = /\b(differ|different|unlike|contrast)\b/.test(content);
    
    if (!hasNonProfit) {
      return "Make sure to name a specific not-for-profit organisation for your analysis.";
    }
    if (!hasDifference) {
      return "Explain how not-for-profit stakeholder interests differ from profit-making organisations.";
    }
  }

  if (taskId.startsWith('2.1')) {
    const hasPrimary = /\b(primary|agriculture|mining|fishing)\b/.test(content);
    const hasSecondary = /\b(secondary|manufacturing|construction|production)\b/.test(content);
    const hasTertiary = /\b(tertiary|service|retail|education)\b/.test(content);
    const hasQuaternary = /\b(quaternary|information|research|technology)\b/.test(content);
    
    const sectorCount = [hasPrimary, hasSecondary, hasTertiary, hasQuaternary].filter(Boolean).length;
    
    if (sectorCount < 4) {
      return "Include all four economic sectors (primary, secondary, tertiary, quaternary) with examples of their output.";
    }
  }

  if (taskId.startsWith('3.1')) {
    const steepleFactors = [
      /\b(social|society|demographic|lifestyle)\b/.test(content),
      /\b(technolog|innovation|automation|digital)\b/.test(content),
      /\b(economic|economy|recession|inflation|unemployment)\b/.test(content),
      /\b(ethic|moral|responsibility|values)\b/.test(content),
      /\b(politic|government|policy|regulation)\b/.test(content),
      /\b(legal|law|legislation|compliance)\b/.test(content),
      /\b(environment|sustainability|climate|green)\b/.test(content)
    ];
    
    const factorCount = steepleFactors.filter(Boolean).length;
    
    if (factorCount < 6) {
      return "Include all STEEPLE factors (Social, Technological, Economic, Ethical, Political, Legal, Environmental) with both positive and negative impacts.";
    }
  }

  // General feedback for longer answers
  if (answer.content.length > 500) {
    return "Great detail! Consider organizing your answer with clear headings and ensure you've addressed all acceptance criteria.";
  }

  return "Good progress! Review the acceptance criteria to ensure you've covered all required points thoroughly.";
};