"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlaygroundForm } from "@/components/playground-form";
import { PlaygroundResult } from "@/components/playground-result";
import type { CoverageRow } from "@/lib/coverage-data";
import { config } from "@/lib/config";
import {
  buildPeopleUrl,
  buildPlaygroundPageUrl,
  parsePlaygroundOptions,
  validatePlaygroundOptions,
  type PlaygroundOptions,
  type QueryProblem,
} from "@/lib/playground-query";
import {
  isPlaygroundResponse,
  mapPlaygroundFailure,
  type PlaygroundFailure,
  type PlaygroundResponse,
} from "@/lib/playground-response";

const requestTimeoutMs = 20000;

export function Playground({ coverageRows }: { coverageRows: CoverageRow[] }) {
  const searchParams = useSearchParams();
  const options = parsePlaygroundOptions(searchParams);
  const initialOptions = useRef(options);
  const [problem, setProblem] = useState<QueryProblem | null>(null);
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);
  const [error, setError] = useState<PlaygroundFailure | null>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const requestUrl = buildPeopleUrl(config.apiOrigin, options, config.portraitContextsEnabled).toString();

  function changeOptions(nextOptions: PlaygroundOptions) {
    window.history.replaceState(
      null,
      "",
      buildPlaygroundPageUrl(window.location.href, nextOptions),
    );
  }

  const run = useCallback(
    async (currentOptions: PlaygroundOptions) => {
      const nationalityContinent = coverageRows.find(
        (row) => row.code === currentOptions.nationality,
      )?.continent;
      const residenceNeedsNationality = coverageRows.some(
        (row) => row.code === currentOptions.residenceCountry && row.status === "pending-name-review",
      );
      const validation = validatePlaygroundOptions(
        currentOptions,
        nationalityContinent,
        residenceNeedsNationality,
      );
      const url = buildPeopleUrl(config.apiOrigin, currentOptions, config.portraitContextsEnabled);
      if (validation || url.toString().length > 2048) {
        setProblem(validation || "url");
        return;
      }
      setProblem(null);
      setError(null);
      setResponse(null);
      controller.current?.abort();
      const abortController = new AbortController();
      controller.current = abortController;
      setLoading(true);
      const timer = window.setTimeout(
        () => abortController.abort("timeout"),
        requestTimeoutMs,
      );
      try {
        if (!navigator.onLine) throw new Error("offline");
        const result = await fetch(url, {
          signal: abortController.signal,
          cache: "no-store",
        });
        if (!result.ok) {
          const body: unknown = await result
            .json()
            .catch(() => null);
          throw Object.assign(new Error("http"), {
            playgroundFailure: mapPlaygroundFailure(
              result.status,
              body,
              result.headers.get("Retry-After") || "",
            ),
          });
        }
        const body: unknown = await result.json();
        if (!isPlaygroundResponse(body)) throw new Error("invalidResponse");
        if (controller.current === abortController) setResponse(body);
      } catch (cause) {
        if (controller.current !== abortController) return;
        const message = cause instanceof Error ? cause.message : "unknown";
        if (
          abortController.signal.aborted &&
          abortController.signal.reason !== "timeout"
        )
          return;
        const suppliedFailure = cause instanceof Error
          ? (cause as Error & { playgroundFailure?: PlaygroundFailure }).playgroundFailure
          : undefined;
        setError(suppliedFailure ?? mapPlaygroundFailure(
          null,
          null,
          "",
          message === "offline" ? "offline" : message === "invalidResponse" ? "invalidResponse" : abortController.signal.reason === "timeout" ? "timeout" : undefined,
        ));
      } finally {
        window.clearTimeout(timer);
        if (controller.current === abortController) {
          controller.current = null;
          setLoading(false);
        }
      }
    },
    [coverageRows, setProblem, setError, setResponse, setLoading],
  );

  useEffect(() => {
    // One sample request makes the result panel useful immediately. It is aborted on navigation.
    const timer = window.setTimeout(() => void run(initialOptions.current), 0);
    return () => {
      window.clearTimeout(timer);
      controller.current?.abort();
    };
  }, [run]);

  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setLoading(false);
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="playground-enter playground-enter-delay-1">
        <PlaygroundForm
          options={options}
          onChange={changeOptions}
          requestUrl={requestUrl}
          problem={problem}
          loading={loading}
          onRun={() => void run(options)}
          onCancel={cancel}
          coverageRows={coverageRows}
        />
      </div>
      <div className="min-w-0 playground-enter playground-enter-delay-2">
        <PlaygroundResult
          response={response}
          loading={loading}
          error={error}
          onRetry={() => void run(options)}
        />
      </div>
    </div>
  );
}
