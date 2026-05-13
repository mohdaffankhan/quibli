import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import type { Analytics } from "@/lib/types";

type Status = "connecting" | "live" | "offline";

interface UsePollLiveOpts {
  slug: string | undefined;
  pollId?: string | undefined;
  /** If true, also subscribe to admin-only analytics:update events. */
  admin?: boolean;
}

export interface ResponseCreatedPayload {
  pollId: string;
  totalResponses: number;
}

interface AnalyticsUpdatePayload {
  pollId: string;
  perQuestion: Array<{
    questionId: string;
    options: Array<{ optionId: string; count: number }>;
  }>;
}

/**
 * Merge a lean analytics:update delta straight into the cached Analytics
 * shape, recomputing totalAnswers/pct exactly as the server does
 * (polls.service.ts:406-425). Returns null when the cached shape can't be
 * reconciled with the delta, signalling the caller to fall back to a refetch.
 */
function mergeAnalytics(
  prev: Analytics | undefined,
  payload: AnalyticsUpdatePayload,
): Analytics | null {
  if (!prev || prev.perQuestion.length === 0) return null;
  const deltaByQ = new Map(
    payload.perQuestion.map((q) => [
      q.questionId,
      new Map(q.options.map((o) => [o.optionId, o.count])),
    ]),
  );

  const perQuestion = prev.perQuestion.map((q) => {
    const counts = deltaByQ.get(q.questionId);
    if (!counts) return q;
    const options = q.options.map((o) => ({
      ...o,
      count: counts.get(o.optionId) ?? 0,
    }));
    const totalAnswers = options.reduce((s, o) => s + o.count, 0);
    return {
      ...q,
      totalAnswers,
      options: options.map((o) => ({
        ...o,
        pct: totalAnswers === 0 ? 0 : (o.count / totalAnswers) * 100,
      })),
    };
  });

  return { ...prev, perQuestion };
}

export function usePollLive({ slug, pollId, admin }: UsePollLiveOpts) {
  const [status, setStatus] = useState<Status>("connecting");
  const [lastEvent, setLastEvent] = useState<ResponseCreatedPayload | null>(
    null,
  );
  const qc = useQueryClient();
  const joinedPollIdRef = useRef<string | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug) return;
    const socket = getSocket();

    function onConnect() {
      setStatus("live");
      socket.emit(
        "poll:join",
        { slug: slug! },
        (ack: { ok: boolean; pollId?: string; error?: string }) => {
          if (ack?.ok && ack.pollId) joinedPollIdRef.current = ack.pollId;
        },
      );
    }

    function onDisconnect() {
      setStatus("offline");
    }

    function onConnectError() {
      setStatus("offline");
    }

    // Server-only data not carried on the socket wire — the
    // uniqueAuthRespondents KPI and the response-velocity timeseries — needs
    // a refetch. Coalesce a single low-priority one shortly after a burst of
    // votes instead of refetching on every event.
    function scheduleSafetyRefetch() {
      if (!pollId || safetyTimerRef.current) return;
      safetyTimerRef.current = setTimeout(() => {
        safetyTimerRef.current = null;
        qc.invalidateQueries({ queryKey: ["analytics", pollId] });
        qc.invalidateQueries({ queryKey: ["analytics-timeseries", pollId] });
      }, 2500);
    }

    function onResponseCreated(payload: ResponseCreatedPayload) {
      setLastEvent(payload);
      if (!pollId || payload.pollId !== pollId) return;
      // Tick the headline number instantly off the socket — no HTTP.
      qc.setQueryData<Analytics | undefined>(["analytics", pollId], (prev) =>
        prev ? { ...prev, totalResponses: payload.totalResponses } : prev,
      );
      scheduleSafetyRefetch();
    }

    function onAnalyticsUpdate(payload: AnalyticsUpdatePayload) {
      if (!pollId || payload.pollId !== pollId) return;
      // Apply the delta directly so the chart moves on the websocket hop
      // with zero round-trip; only refetch if the cache can't be merged.
      let merged = false;
      qc.setQueryData<Analytics | undefined>(["analytics", pollId], (prev) => {
        const next = mergeAnalytics(prev, payload);
        if (next) {
          merged = true;
          return next;
        }
        return prev;
      });
      if (!merged) qc.invalidateQueries({ queryKey: ["analytics", pollId] });
    }

    function onStatus(payload: { pollId: string; status: string }) {
      if (pollId === payload.pollId) {
        qc.invalidateQueries({ queryKey: ["poll", pollId] });
      }
    }

    if (socket.connected) {
      onConnect();
    } else {
      setStatus("connecting");
    }
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("response:created", onResponseCreated);
    if (admin) socket.on("analytics:update", onAnalyticsUpdate);
    socket.on("poll:status", onStatus);

    return () => {
      if (joinedPollIdRef.current) {
        socket.emit("poll:leave", { pollId: joinedPollIdRef.current });
        joinedPollIdRef.current = null;
      }
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("response:created", onResponseCreated);
      if (admin) socket.off("analytics:update", onAnalyticsUpdate);
      socket.off("poll:status", onStatus);
    };
  }, [slug, pollId, admin, qc]);

  return { status, lastEvent };
}
