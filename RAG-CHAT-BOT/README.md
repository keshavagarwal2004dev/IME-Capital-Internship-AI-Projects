# 📌 n8n Financial Chatbot with Supabase Vector Database

This project contains **three n8n workflows** that together create an AI-powered financial chatbot system connected to **Supabase** as a vector database.

---

## 🚀 Workflows Included

### 1. **Chatbot Workflow (`CHATBOT`)**
- Provides an **AI chatbot interface** to answer questions about company financial data.
- Uses **OpenAI GPT model** for conversation.
- Restricts answers strictly to the **Supabase vector database**.
- Stores chat memory in **Postgres** to maintain conversation history.

### 2. **Vector Database Workflow (`VECTOR DATABASE`)**
- Watches a **Google Drive folder** for new PDF files (e.g., company financial reports, transcripts).
- Extracts text from uploaded PDFs.
- Splits text into chunks for efficient retrieval.
- Embeds content with **OpenAI embeddings**.
- Stores embeddings + metadata in **Supabase Vector Store**.

### 3. **Database Cleanup Workflow (`DELETE DATABASE`)**
- Scheduled cleanup workflow.
- Deletes all documents from `public.documents`.
- Truncates chat history table `n8n_chat_histories`.
- Ensures the database is fresh for new uploads.

---

## 🧩 Problem This Solves

Companies generate **large amounts of financial data** (quarterly reports, transcripts, KPIs).  
Traditionally, retrieving specific details (like *“Net Income for Q2 2023”*) is time-consuming.

This project solves it by:
- Centralizing financial data into **Supabase** as a semantic search engine.
- Allowing users to **chat naturally** and retrieve exact information from the documents.
- Preventing **hallucinations**: chatbot only answers with what’s in the database.
- Keeping history + enabling easy reset with a cleanup workflow.

---

## 💬 Prompt & Behavioral Rules

The chatbot uses a **system prompt** to enforce strict behavior:

1. **Source Restriction**  
   - Only respond with information from the Supabase Vector Store (`Financial_Information` tool).  
   - If no answer is found → respond:  
     > *"I'm sorry, but I couldn't find relevant information in the database to answer your question."*

2. **No Fabrication**  
   - No guessing, no general financial trends.  
   - Only retrieved data is allowed.

3. **Greeting Handling**  
   - If the user says “Hi/Hello,” respond politely but do not provide financial data.

4. **Clarity & Relevance**  
   - Answers must be concise and directly sourced.



---

## 🔗 Connecting to Supabase

To integrate with Supabase:

1. Create a **Supabase project** → [https://supabase.com](https://supabase.com)
2. In Supabase Dashboard → Create a **table** named `documents`. use vector enstion in superbase 
   - This will store embeddings + metadata.
3. Get your **API URL** and **Service Role Key** from Supabase Project → Settings → API.
4. In **n8n Credentials**, create a new **Supabase API** credential:
   - **URL**: `https://<your-project-ref>.supabase.co`
   - **API Key**: `<your-service-role-key>`
5. Map the credential in:
   - `Supabase Vector Store` node in **CHATBOT**.
   - `Supabase Vector Store` node in **VECTOR DATABASE**.

---

## 🛠️ How to Use

1. **Upload Reports**  
   - Place financial PDFs into the **Google Drive folder** connected in the `VECTOR DATABASE` workflow.
   - They will be automatically processed and indexed into Supabase.

2. **Chat with the Bot**  
   - Open the chatbot interface from the `CHATBOT` workflow.
   - Ask financial questions in natural language.

3. **Database Reset**  
   - Run or schedule the `DELETE DATABASE` workflow to wipe old data and chat history.

---

## 📂 Tech Stack

- **n8n** → Orchestration
- **OpenAI GPT** → Conversational AI
- **Supabase** → Vector Database
- **Postgres** → Chat Memory
- **Google Drive** → Document Source

---

## ✅ Summary

This project is a **complete AI agent pipeline**:  
- Upload PDFs → Index into Supabase → Query via Chatbot → Reset anytime.  
It enables **financial teams** to quickly access insights without manually reading through hundreds of pages.

---


##  Supabase Vector Storage & Retrieval (NoSQL-style + pgvector)

This section explains how to **store embeddings** in Supabase using PostgreSQL with `jsonb` metadata (NoSQL style) plus vector support via the `pgvector` extension, and how to **retrieve similar embeddings** using vector similarity search.

---

### 1. Enable Vector Extension

```sql
-- Enable the pgvector extension
create extension if not exists vector;

-- Create table with flexible JSON metadata and vector embeddings
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  content      text,              -- Raw text (e.g. document chunk)
  metadata     jsonb,             -- NoSQL-style structured metadata
  embedding    vector(1536)       -- Embedding vector (e.g. from OpenAI)
);
note -Use vector(1536) if you're using an embedding model like OpenAI's text-embedding-3, which outputs 1536-dimensional vectors.[ check for dimensions ]

create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold  float,
  match_count      int
) returns table (
  id          uuid,
  content     text,
  metadata    jsonb,
  similarity  float
) language sql stable as $$
  select
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
 
