import {
  CALENDAR_ICS_BACK_DAYS,
  CALENDAR_ICS_FORWARD_DAYS,
} from "@/lib/calendar/constants";
import { buildIcsCalendarDocument } from "@/lib/calendar/ics";
import { listPublishedCalendarEventsOverlappingRangeForFeed } from "@/lib/calendar/public-queries";

export async function GET() {
  const now = Date.now();
  const rangeStart = new Date(
    now - CALENDAR_ICS_BACK_DAYS * 24 * 60 * 60 * 1000
  );
  const rangeEnd = new Date(
    now + CALENDAR_ICS_FORWARD_DAYS * 24 * 60 * 60 * 1000
  );

  let rows: Awaited<
    ReturnType<typeof listPublishedCalendarEventsOverlappingRangeForFeed>
  > = [];

  try {
    rows = await listPublishedCalendarEventsOverlappingRangeForFeed(
      rangeStart,
      rangeEnd
    );
  } catch {
    rows = [];
  }

  const body = buildIcsCalendarDocument(rows);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="zimomo-fans-calendar.ics"',
      "Cache-Control": "no-store",
    },
  });
}
