// Telemetry must start before any application modules (express, pg, http)
// are loaded so Application Insights can patch them for auto-instrumentation.
// The app itself is therefore imported dynamically in ./main.
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  try {
    const appInsights = (await import("applicationinsights")).default;
    appInsights
      .setup()
      .setAutoCollectConsole(false)
      .setAutoCollectExceptions(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectRequests(true)
      .setAutoCollectDependencies(true)
      .setSendLiveMetrics(true)
      .start();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize Application Insights", err);
  }
}

await import("./main");

export {};
