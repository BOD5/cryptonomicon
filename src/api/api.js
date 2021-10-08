import { API_KEY } from "../config";

const tickersHandlers = new Map();
const tickerPrices = new Map();

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

// eslint-disable-next-line no-unused-vars

const VALUTE = "USD";

const AGGREGATE_INDEX = "5";
const ERROR_INDEX = "500";
const ERROR_SUB = "INVALID_SUB";
const ERROR_UNSUB = "SUBSCRIPTION_UNRECOGNIZED";

socket.addEventListener("message", (res) => {
  const messageData = JSON.parse(res.data);
  const err =
    checkError(messageData, ERROR_SUB, subscribeToTicker) ||
    checkError(messageData, ERROR_UNSUB, unsubscribeFromTicker);
  if (!err) {
    obtainingData(messageData);
  }
});

const useHandlers = (keyString, args) => {
  const handlers = tickersHandlers.get(keyString) || [];
  handlers.forEach((fn) => fn(args));
};

const crossConvert = (from, middle, to, subFun) => {
  subFun(
    from,
    (newPrice) => {
      tickerPrices.set(`${middle}-${from}`, newPrice);
      const convertPrice = newPrice * tickerPrices.get(`${middle}-${to}`);
      if (convertPrice) useHandlers(`${from}-${to}`, convertPrice);
    },
    middle
  );
  subFun(
    middle,
    (newPrice) => {
      tickerPrices.set(`${middle}-${to}`, newPrice);
      const convertPrice = newPrice * tickerPrices.get(`${middle}-${from}`);
      if (convertPrice) useHandlers(`${from}-${to}`, convertPrice);
    },
    to
  );
};

const checkError = (data, message, cb) => {
  const { TYPE: type, MESSAGE: errMessage, PARAMETER: param } = data;
  if (
    type === ERROR_INDEX &&
    errMessage === message &&
    param.substr(param.length - 3) === VALUTE
  ) {
    const params = param.split("~");
    const ticker = params[2];
    crossConvert(ticker, "BTC", "USD", cb);
    return true;
  }
  return false;
};

const obtainingData = (data) => {
  const { TYPE: type, FROMSYMBOL: currency, PRICE, TOSYMBOL: toSymbol } = data;
  if (type !== AGGREGATE_INDEX || !PRICE) {
    return;
  }
  let newPrice = PRICE;
  useHandlers(`${currency}-${toSymbol}`, newPrice);
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

const subscribeToTickerOnWs = (ticker, to) => {
  messageToWs({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${to}`],
  });
};

const unsubscribeFromTickerOnWs = (ticker, to) => {
  messageToWs({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${to}`],
  });
};

const subscribeFunctionToTicker = (tickerName, cb, to = "USD") => {
  const key = `${tickerName}-${to}`;
  const subscribers = tickersHandlers.get(key) || [];
  tickersHandlers.set(key, [...subscribers, cb]);
};

const subscribeToTicker = (tickerName, cb, to = "USD") => {
  const key = `${tickerName}-${to}`;
  if ((tickersHandlers.get(key) || []).length < 1) {
    subscribeToTickerOnWs(tickerName, to);
  }
  subscribeFunctionToTicker(tickerName, cb, to);
};

const unsubscribeFncFromTicker = (tickerName, cb, to = "USD") => {
  const key = `${tickerName}-${to}`;
  const subscribers = tickersHandlers.get(key) || [];
  tickersHandlers.set(
    key,
    subscribers.filter((fn) => fn !== cb)
  );
};

const unsubscribeFromTicker = (tickerName, cb, to = "USD") => {
  const key = `${tickerName}-${to}`;
  unsubscribeFncFromTicker(tickerName, cb, to);
  if ((tickersHandlers.get(key) || []).length < 1) {
    unsubscribeFromTickerOnWs(tickerName, to);
    tickersHandlers.delete(key);
  }
};

window.handlers = tickersHandlers;

export { subscribeToTicker, unsubscribeFromTicker };
