export interface FeedbackRequest {
  unitId: string;
  outcomeTaskId: string;
  answerText: string;
  feedbackType: string;
}

export interface FeedbackResponse {
  feedbackMessage: string;
  feedbackType: string;
  level: string;
  score: number;
}

const FEEDBACK_SERVICE_URL = import.meta.env.VITE_FEEDBACK_SERVICE_URL || 'https://decent-standard-field-chicago.trycloudflare.com/feedback';

export const requestFeedback = async (request: FeedbackRequest): Promise<FeedbackResponse> => {
  try {
    const response = await fetch(FEEDBACK_SERVICE_URL, {
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