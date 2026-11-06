-- Defense in depth: a comment must belong to exactly one parent (task OR support ticket).
-- The API already validates this in CommentsController.create; this constraint keeps
-- direct SQL writes, seeds and future code paths from producing orphaned/ambiguous rows.
ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_exactly_one_target"
  CHECK ((("taskId" IS NOT NULL)::int + ("ticketId" IS NOT NULL)::int) = 1);
