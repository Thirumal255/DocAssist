import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export interface PatientContext {
  age: number;
  gender: string;
  chronicConditions: string[];
  allergies: string[];
  recentPrescriptions: {
    diagnosis: string;
    medicines: string[];
    date: string;
  }[];
}

export interface AISuggestion {
  medicines: {
    name: string;
    genericName: string;
    dose: string;
    frequency: string;
    duration: string;
    reason: string;
  }[];
  warnings: string[];
  interactions: string[];
  notes: string;
}

/**
 * Get AI-powered prescription suggestions
 */
export async function getPrescriptionSuggestions(
  diagnosis: string,
  chiefComplaint: string | undefined,
  patient: PatientContext
): Promise<AISuggestion> {
  const systemPrompt = `You are a clinical decision support AI assistant for doctors in India. 
You help suggest appropriate medications based on diagnosis and patient history.
Always use Indian drug names (brand names commonly available in India).
Be conservative and prioritize patient safety.
Consider drug interactions and contraindications carefully.

IMPORTANT: Your suggestions are for reference only. The doctor makes the final decision.`;

  const userPrompt = `Patient Information:
- Age: ${patient.age} years
- Gender: ${patient.gender}
- Chronic Conditions: ${patient.chronicConditions.length > 0 ? patient.chronicConditions.join(', ') : 'None'}
- Known Allergies: ${patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None'}

Recent Prescriptions (last 3 visits):
${patient.recentPrescriptions.length > 0 
  ? patient.recentPrescriptions.map((rx, i) => 
      `${i + 1}. [${rx.date}] ${rx.diagnosis}: ${rx.medicines.join(', ')}`
    ).join('\n')
  : 'No recent prescriptions'}

Current Visit:
- Chief Complaint: ${chiefComplaint || 'Not specified'}
- Diagnosis: ${diagnosis}

Please suggest appropriate medications. Respond in this exact JSON format:
{
  "medicines": [
    {
      "name": "Brand Name with Strength (e.g., Glycomet 500mg)",
      "genericName": "Generic Name (e.g., Metformin)",
      "dose": "Dosage pattern (e.g., 1-0-1)",
      "frequency": "Frequency description (e.g., twice daily)",
      "duration": "Duration (e.g., 30 days)",
      "reason": "Brief clinical justification"
    }
  ],
  "warnings": ["Important warnings for this patient"],
  "interactions": ["Potential drug interactions to watch"],
  "notes": "Summary of recommendations and any additional advice"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent medical advice
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const suggestion = JSON.parse(content) as AISuggestion;
    return suggestion;
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return a safe fallback
    return {
      medicines: [],
      warnings: ['AI suggestions temporarily unavailable. Please prescribe based on clinical judgment.'],
      interactions: [],
      notes: 'Unable to generate AI suggestions at this time.',
    };
  }
}

/**
 * Check for drug interactions
 */
export async function checkDrugInteractions(
  medicines: string[],
  patientAllergies: string[]
): Promise<{ interactions: string[]; warnings: string[] }> {
  const prompt = `Check for drug interactions between these medications:
${medicines.join(', ')}

Patient allergies: ${patientAllergies.length > 0 ? patientAllergies.join(', ') : 'None'}

Respond in JSON format:
{
  "interactions": ["List any significant drug-drug interactions"],
  "warnings": ["List any allergy-related warnings or contraindications"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'You are a pharmacology expert. Identify drug interactions and allergy concerns. Be thorough but avoid false alarms.' 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { interactions: [], warnings: [] };
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Drug interaction check error:', error);
    return { interactions: [], warnings: [] };
  }
}

/**
 * Generate clinical summary
 */
export async function generateClinicalSummary(
  visits: { date: string; diagnosis: string; medicines: string[] }[]
): Promise<string> {
  if (visits.length === 0) {
    return 'No visit history available.';
  }

  const prompt = `Summarize this patient's medical history in 2-3 sentences for quick reference:

Visit History:
${visits.map(v => `- ${v.date}: ${v.diagnosis} (Rx: ${v.medicines.join(', ')})`).join('\n')}

Keep it brief and clinically relevant.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content || 'Unable to generate summary.';
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Unable to generate summary.';
  }
}
