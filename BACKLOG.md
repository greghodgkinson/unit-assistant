# Backlog

## How to Add a Story

Add a new entry under **Open** using this format:

```
### US-XXX: Title
**As a** [role], **I want** [goal], **so that** [reason].
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

Increment the ID sequentially. When a story is done, move it to **Completed** and check off its criteria.

---

## Open

### US-001: Extended Unit Task Status Lifecycle
**As a** student, **I want** my unit tasks to progress through a full review lifecycle, **so that** I can track where my work is in the feedback and marking process.

Note: submission is at the **unit level** (not per-task) and is triggered from the Overall Progress dashboard. Review and outcomes happen outside the app — the student manually records them back in.

- [ ] Task statuses follow this lifecycle (existing statuses kept as-is, new ones added after):
  1. `not-started` — task not begun
  2. `in-progress` — student is working on it
  3. `completed` — student is happy with their answer
  4. `submitted-for-review` — set on all completed/not-yet-achieved tasks when student clicks "Submit for Review" at unit level from the Overall Progress dashboard
  5. `not-yet-achieved` — student records this outcome + feedback received externally; resubmission also done from the Overall Progress dashboard
  6. `achieved` — student records this outcome, task is done
- [ ] UI reflects each status with a distinct label/indicator
- [ ] Transitions between statuses are enforced in the correct order
- [ ] Submit for Review is only available from the Overall Progress dashboard (not from within a task)

### US-002: Task Feedback Capture and Answer Iteration
**As a** student, **I want** to record feedback I received externally and edit my answer in response, **so that** I can track and action feedback within the app and get help from the unit assistant.
- [ ] Each task stores two fields: `answer` (always the current version) and `feedback` (feedback entered manually from external review)
- [ ] When recording a `not-yet-achieved` outcome, student is prompted to enter the feedback notes received
- [ ] Student can view feedback alongside their current answer and edit the answer in response
- [ ] Unit assistant is aware of the current feedback when answering questions about a task, and tailors responses accordingly

### US-003: Recording Review Outcome
**As a** student, **I want** to record the outcome of an external review (Achieved or Not Yet Achieved), **so that** the app reflects the real status of my submission and I can action any feedback.
- [ ] Student can mark a submitted task as `achieved` or `not-yet-achieved`
- [ ] `not-yet-achieved` prompts for feedback notes (US-002) and returns the task to an editable state
- [ ] `achieved` marks the task as done with no further action required
- [ ] Outcome and any feedback are clearly visible in the task UI

### US-004: Status Change Timestamp Tracking
**As a** student, **I want** all task status changes to be timestamped, **so that** I have a full history of my task's progression through the review lifecycle.

Note: the existing `TaskStatusChange` interface already tracks `timestamp`, `status`, and `previousStatus` — new statuses must use the same structure.

- [ ] All new statuses (`submitted-for-review`, `not-yet-achieved`, `achieved`) are recorded in `statusHistory` using the existing `TaskStatusChange` structure
- [ ] Each status change captures the timestamp, new status, and previous status

### US-005: Matrix Progress Dashboard
**As a** student, **I want** a matrix dashboard showing all my units, tasks, and outcome tasks against their status progression, **so that** I can see at a glance how far along everything is and when each milestone was reached.

Note: replaces/deprecates the existing dashboard.

- [ ] Rows represent each unit task / outcome task
- [ ] Columns represent each status in order: `not-started` → `in-progress` → `completed` → `submitted-for-review` → `not-yet-achieved` | `achieved`
- [ ] Each cell is a coloured block — green when that status has been reached, empty/grey otherwise
- [ ] Green blocks display the timestamp of when the task entered that status
- [ ] Blocks read left to right, giving a visual sense of progression
- [ ] `not-yet-achieved` and `achieved` are handled as branching outcomes in the final column(s)
- [ ] Existing dashboard is deprecated and replaced by this view

---

## Completed

<!-- Add completed stories here -->
