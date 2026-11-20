# ensemble – editing artist data

All artist data lives in CSV files. The app reads them when the page loads.

    public/data/<artist>/*.csv      <- edit these (source)
    dist/data/<artist>/*.csv        <- the same files inside the built site

Artists (folder names): maya = Maya Rivers, dev, owls.
NOTE: dev/ and owls/ are currently copies of Maya's placeholder data. Replace them with real data.

## Quickest way to change data on the live site
1. Edit a CSV in dist/data/<artist>/ (Excel / Google Sheets -> Export as CSV, UTF-8).
2. Re-deploy the dist folder to Netlify.
Also copy the edit into public/data/ if you will rebuild later (npm run build).

If a file has a mistake, the app shows a plain-English message naming the file, row and column.

## Files
overview.csv          key,value rows. Keys: window_label, last_synced, total_streams, total_streams_delta, listeners, listeners_delta, saves, saves_delta, indexed_documents, followers, followers_delta, new_listeners, new_listeners_note, save_rate, new_listeners_pct, returning_listeners_pct, catalog_avg_save_rate_pct, new_comments, need_reply, sentiment_positive_pct, sentiment_neutral_pct, sentiment_negative_pct. (All required.)
weekly_streams.csv   week,k            (k = thousands of streams; any number of weeks)
listener_cities.csv  city,country,k
tracks.csv           track,k,growth,share      (growth and share are percentages)
stream_sources.csv   source,detail,share
age_groups.csv       group,share
platform_breakdown.csv platform,detail,k,share
connected_accounts.csv name,detail,connected   (true/false)
release_save_rates.csv release,k,saveRate
next_steps.csv       title,detail
fan_conversations.csv source,author,age,text,needsReply  (true/false)
project.csv          key,value rows: name, start, end (YYYY-MM-DD), collaborators, documents (separated by |)
tasks.csv            id,title,category,note,assignee,due,status,priority
                     status = todo | progress | done ; due = YYYY-MM-DD ; id must be unique

## Rules
- Keep the header row exactly as is. Wrap any text containing a comma in "quotes".
- Numbers: no K/% symbols in number columns (use 620, not 620K).
- Task changes made on the board are saved in each browser only. Use "Download tasks as CSV" on the
  Project management screen, then replace tasks.csv to make them permanent.

## AI chat (Conversation screen)
- Uses Claude Haiku 5.5 through the Netlify function netlify/functions/chat.mts (URL /api/chat).
- It reads the same CSV files, so edited data changes the answers automatically.
- Needs ONE environment variable in Netlify: ANTHROPIC_API_KEY (Project configuration -> Environment variables). Never put the key in the code or in chat.
- Optional variables: CHAT_PER_VISITOR_DAILY (default 20), CHAT_GLOBAL_DAILY (default 400), CHAT_MODEL (default claude-haiku-5-5).
- Without the key, the chat shows "The AI chat isn't switched on yet".
- The function only runs if the deploy includes the netlify/functions folder (deploy from source or with the Netlify CLI, not a plain dist upload).
