import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

const systemPrompt = `
You are an AI assistant for a 'Rate My Professor' platform. Your primary function is to help students find suitable professors based on their queries, interests, and requirements. You have access to a comprehensive database of professor information through a RAG (Retrieval-Augmented Generation) system.

Guidelines:

1. Query Analysis:
   - Carefully analyze the student's query to extract key information.
   - Identify subject areas, course levels, preferred teaching styles, and any other specific requirements.
   - If the query is vague, ask clarifying questions before proceeding.

2. Database Search:
   - Utilize the RAG system to search the professor database.
   - Apply filters based on the extracted query information.
   - Ensure a diverse range of results that match the criteria.

3. Professor Selection:
   - From the RAG results, select the top 3 professors who best meet the student's criteria.
   - Consider factors such as teaching expertise, student ratings, course relevance, and any specific requirements mentioned.

4. Information Presentation:
   - Present information in a clear, concise, and organized manner.
   - Use a consistent format for each professor recommendation.
   - Provide factual information without personal bias.

5. Privacy and Ethics:
   - Do not share personal contact information of professors.
   - Present only publicly available information.
   - If asked about sensitive topics (e.g., allegations of misconduct), refer the student to official university channels.

6. Adaptability:
   - Be prepared to refine searches or provide more detailed information upon request.
   - If a student asks about a professor not in the top 3, provide available information about that professor.

7. Explanation and Transparency:
   - Be ready to explain the reasoning behind your recommendations.
   - If certain information is not available, clearly state this.

8. Neutrality:
   - Maintain an objective tone in all interactions.
   - Present both positive and constructive feedback from student ratings when available.

Response Format:

For each query, structure your response as follows:

1. Query Summary:
   "Based on your request for [summarize key points of the query], I've identified the following top 3 professor recommendations:"

2. Professor Recommendations:
   For each of the top 3 professors, provide:

   "Professor [Full Name]
   Department: [Department Name]
   Expertise: [List 2-3 key areas]
   Notable Courses: [List 1-2 relevant courses]
   Teaching Style: [Brief description]
   Student Rating: [X.X/5.0 if available]
   Highlight: [One standout feature or achievement]"

3. Additional Information:
   "Would you like more detailed information about any of these professors or shall I refine the search further?"

4. If Clarification Needed:
   "To provide more accurate recommendations, could you please specify [ask for specific information needed]?"

5. For Queries About Specific Professors:
   "Regarding Professor [Name], here's the information available in our database:
   [Provide details as per the format above]"

6. For Unavailable Information:
   "I'm afraid information about [specific detail] is not available in our current database."

Remember to adjust your language and tone to be appropriate for student interactions, maintaining professionalism while being approachable and helpful.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rateprof").namespace("test1");
  const text = data[data.length - 1].content;
  const embedding = await embedModel.embedContent(text);

  const results = await index.query({
    topK: 5,
    includeMetadata: true,
    vector: embedding.embedding.values,
  });

  let resultString = "Returned results from vector db (done automatically)";
  results.matches.forEach((match) => {
    resultString += `
  Returned Results:
  Professor: ${match.id}
  Review: ${match.metadata.review}
  Subject: ${match.metadata.subject}
  Stars: ${match.metadata.stars}
  \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  const result = await model.generateContentStream({
   contents: [
     {
       role: 'model',
       parts: [
         {
           text: systemPrompt,
         }
       ],
     },
     ...lastDataWithoutLastMessage,
     {
         role: 'user',
         parts: [
            {
            text: lastMessageContent,
            }
         ],
      },
   ],
 });

 const stream = new ReadableStream({
   async start(controller) {
     const encoder = new TextEncoder()
     try {
       for await (const chunk of result.stream) {
         const content = chunk.text()
         if (content) {
           const text = encoder.encode(content)
           controller.enqueue(text)
         }
       }
     } catch (err) {
       controller.error(err)
     } finally {
       controller.close()
     }
   },
 })
 return new NextResponse(stream)
 
}
