# Notifications API

Run by the platform team. It resolves a member's contact details and sends the message for a
template. This page records the parts of their contract we rely on.

## Sending a notification

`POST /notifications` with `{ "memberId", "template", "data" }` answers `2xx` once it has accepted
the notification for delivery. The `loan-overdue` template reads `data.loanId` and `data.dueOn`.
