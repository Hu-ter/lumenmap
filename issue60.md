Problem
The dashboard says Hubble updates in batches but does not show when the displayed data actually ends.

Scope
Display upstream data-through time and current lag.
Use UTC and a human-readable relative value.
Keep exact timestamp accessible.
Update the indicator when response data changes.
Out of scope
Building stale-data alerts.
Changing freshness calculation.
Acceptance criteria
The indicator uses response freshness metadata.
Exact UTC timestamp is accessible.
Relative lag never implies data is newer than reported.
Cache hits show the metadata of their payload.
Loading and unavailable states are distinct.
Dependencies
#12
Verification
Render fresh, delayed, cached, and unavailable metadata fixtures and compare the indicator with response values.


