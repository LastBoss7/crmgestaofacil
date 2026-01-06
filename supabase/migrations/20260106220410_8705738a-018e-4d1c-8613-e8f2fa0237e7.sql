-- Enable realtime for sales table
ALTER TABLE public.sales REPLICA IDENTITY FULL;

-- Add table to realtime publication if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'sales'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
    END IF;
END $$;