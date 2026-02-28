# Polish Items

A running list of non-critical improvements to revisit later.

## Items

1. **Auto-rename chats based on conversation content**
   - Status: Not working (AI Gateway requires payment credentials)
   - Current behavior: Chats stay named "New Chat" 
   - Desired behavior: Auto-generate descriptive titles including job name, job ID, and action type (e.g., "ngrok webhook tester - Measurements (19782307)")
   - Fallback mechanism implemented but not triggering correctly
   - Files involved: `lib/actions/chat.ts` (generateChatTitle function), `app/chat/[chatId]/page.tsx`
