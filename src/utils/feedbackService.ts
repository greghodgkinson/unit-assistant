export interface FeedbackRequest {
  unitId: string;
  outcomeTaskId: string;
  answerText: string;
  feedbackType: string;
  taskDetails: {
    description: string;
    type: string;
    acceptance_criteria: Array<{
      id: string;
      criteria: string;
    }>;
  };
  learningOutcome: {
    id: string;
    description: string;
    indicative_content: Array<{
      description: string;
    }>;
  };
}

export interface FeedbackResponse {
  feedbackMessage: string;
  feedbackType: string;
  level: string;
  score: number;
}

const FEEDBACK_SERVICE_URL = import.meta.env.VITE_FEEDBACK_SERVICE_URL || 'https://unit-assistant-service.fly.dev/feedback';

export const requestFeedback = async (request: FeedbackRequest): Promise<FeedbackResponse> => {
  try {
    // Get the service URL from localStorage or use default
    const savedUrl = localStorage.getItem('learning-assistant-feedback-service-url');
    const serviceUrl = savedUrl || FEEDBACK_SERVICE_URL;
    
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Feedback service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error requesting feedback:', error);
    throw new Error('Failed to get feedback from service. Please try again later.');
  }
};

export interface StudentQuestionRequest {
  unitId: string;
  outcomeTaskId: string;
  question: string;
  context: {
    currentAnswer?: string;
    taskDescription: string;
    acceptanceCriteria: Array<{
      id: string;
      criteria: string;
    }>;
  };
}

export interface StudentQuestionResponse {
  answer: string;
  suggestions?: string[];
  relatedResources?: string[];
}

export const askStudentQuestion = async (request: StudentQuestionRequest): Promise<StudentQuestionResponse> => {
  try {
    // Get the service URL from localStorage or use default
    const savedUrl = localStorage.getItem('learning-assistant-feedback-service-url');
    const serviceUrl = savedUrl || FEEDBACK_SERVICE_URL;
    
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        operation: 'student-question'
      }),
    });

    if (!response.ok) {
      throw new Error(`Student question service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error asking student question:', error);
    throw new Error('Failed to get answer from assistant. Please try again later.');
  }
};