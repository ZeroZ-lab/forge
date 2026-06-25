# Implementation quality rubric

Quality dimensions for evaluating whether an implementation meets its stated goal.

## Dimensions

| Dimension | Question | Good | Poor |
|-----------|----------|------|------|
| Goal achievement | Does it meet the stated goal? | All completion criteria satisfied | Goal partially met |
| Decision links | Are decisions traceable? | Decisions reference goal.md | Decisions unrecorded |
| Test evidence | Are tests meaningful? | Tests verify completion criteria | Tests verify implementation details only |
| Evidence form | Is evidence verifiable? | Command + real output (exit code / output excerpt) | Conclusion string like "tests pass" only |
| Runtime safety | Does it run? | Command run with passing output | Cannot verify; or claimed pass without command |
| Scope control | Is scope contained? | Only goal-relevant changes | Unrelated changes included |
| Constraint respect | Are constraints met? | All stated constraints satisfied | Constraints violated or ignored |
