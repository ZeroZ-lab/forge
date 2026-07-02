# Held-out task: bugfix red-capable loop

Users report that editing a task title sometimes drops the existing due date.
The bug appears when the edit form sends only changed fields.

Constraints:

- Build or identify a failing signal before changing implementation.
- The regression test must fail against the due-date loss, not just assert a
  helper constant.
- Recheck the original partial-update scenario after the fix.
- Stop safely if the codebase lacks enough surface to reproduce the issue.

Review focus:

- Was there a red-capable loop?
- Was the test seam correct?
- Did the patch avoid unrelated update semantics?
