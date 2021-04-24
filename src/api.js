const API_KEY =
  "0c8498c1e018505123ee1bcdf7dd5ec877a8313a266d8e28341ac885f46d9614";

const tickersHandlers = new Map();

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATE_INDEX = "5";

socket.addEventListener("message", (res) => {
  const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice } = JSON.parse(
    res.data
  );
  if (type !== AGGREGATE_INDEX || !newPrice) {
    return;
  }
  const handlers = tickersHandlers.get(currency) || [];
  handlers.forEach((fn) => fn(newPrice || "-"));
});

const loadTickers = async () => {
  if (tickersHandlers.size === 0) {
    return;
  }
  return await fetch(
    `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${[
      ...tickersHandlers.keys(),
    ].join(",")}&tsyms=USD&api_key=${API_KEY}`
  )
    .then((data) => data.json())
    .then((rawData) => {
      const updatetPrices = Object.fromEntries(
        Object.entries(rawData).map(([key, value]) => [key, value.USD])
      );
      Object.entries(updatetPrices).forEach(([currency, newPrice]) => {
        const handlers = tickersHandlers.get(currency) || [];
        handlers.forEach((fn) => fn(newPrice));
      });
    });
};

const messageToWs = (message) => {
  const stringifiedMSg = JSON.stringify(message);
  if (socket.readyState === socket.OPEN) {
    socket.send(stringifiedMSg);
    return;
  }
  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMSg);
    },
    { once: true }
  );
};

const subscribeToTickerOnWs = (ticker) => {
  messageToWs({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
};

const unsubscribeFromTickerOnWs = (ticker) => {
  messageToWs({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
};

const subscribeToTicker = (tickerName, cb) => {
  const subscribers = tickersHandlers.get(tickerName) || [];
  tickersHandlers.set(tickerName, [...subscribers, cb]);
  subscribeToTickerOnWs(tickerName);
};

const unsubscribeFromTicker = (tickerName) => {
  tickersHandlers.delete(tickerName);
  unsubscribeFromTickerOnWs(tickerName);
};

// setInterval(loadTickers, 5000);

window.tickers = tickersHandlers;

export { loadTickers, subscribeToTicker, unsubscribeFromTicker };
