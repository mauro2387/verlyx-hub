-- First, remove the existing check constraint so we can update the data
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Update any projects with 'holding' to 'on_hold'
UPDATE projects 
SET status = 'on_hold' 
WHERE status = 'holding';

-- Update any other invalid status values to 'backlog'
UPDATE projects 
SET status = 'backlog' 
WHERE status NOT IN ('backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done', 'cancelled');

-- Add a new check constraint that allows all status values
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done', 'cancelled'));
