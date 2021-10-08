<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <div
      v-if="!tockenList"
      class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
    >
      <svg
        class="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
    <div class="container">
      <section>
        <add-ticker
          :ticker-list="tockenList"
          :is-containe="isContaine"
          @add-ticker="add"
          @change-is-containe="(d) => (isContaine = d)"
        />
      </section>

      <template v-if="tickers.length > 0">
        <hr class="w-full border-t border-gray-600 my-4" />
        <input
          v-model="filter"
          type="text"
          class="block pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
          placeholder="Фільтр"
        />
        <button
          type="button"
          v-if="page > 1"
          @click="page -= 1"
          class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Назад
        </button>
        <button
          type="button"
          v-if="hasNextPage"
          @click="page += 1"
          class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Вперед
        </button>
        <hr class="w-full border-t border-gray-600 my-4" />
        <h2 v-if="filteredTickers.length === 0">Empty</h2>
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="t in filteredTickers"
            :key="t.name"
            @click="selectTocken(t)"
            :class="{
              'border-4': selectedTocken === t,
              'bg-red-100': t.price === '-',
            }"
            class="bg-white overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ t.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formatedPrice(t.price) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="remove(t)"
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path></svg
              >Удалить
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>

      <ticker-graph
        :selected-tocken="selectedTocken"
        :graph-data="graph"
        @close-graph="close"
        @max-graph-length="graphLength"
      />
    </div>
  </div>
</template>

<script>
import { subscribeToTicker, unsubscribeFromTicker } from "./api/api";
import AddTicker from "./components/AddTicker.vue";
import TickerGraph from "./components/TickerGraph.vue";

export default {
  name: "App",

  components: {
    AddTicker,
    TickerGraph,
  },

  data() {
    return {
      tickers: [],
      selectedTocken: null,
      graph: [],
      tockenList: {},
      help: [],
      isContaine: false,
      page: 1,
      filter: "",
      maxGraphElem: 1,
    };
  },
  created: async function () {
    const f = await fetch(
      "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
    );
    const data = f.json();
    data.then((d) => {
      this.tockenList = d.Data;
    });
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );

    const VALID_KEYS = ["filter", "page"];
    VALID_KEYS.forEach((key) => {
      if (windowData[key]) {
        this[key] = windowData[key];
      }
    });
    const tickersData = localStorage.getItem("tickers-list");
    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach((ticker) => {
        ticker.updateTikerFn = this.createTickerUpdater(ticker);
      });
    }
  },
  watch: {
    filter() {
      this.page = 1;
    },
    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `/?filter=${value.filter}&page=${value.page}`
      );
    },
    tickers() {
      localStorage.setItem("tickers-list", JSON.stringify(this.tickers));
    },
    filteredTickers() {
      if (!this.filteredTickers.length && this.page > 1) this.page--;
    },
    selectedTocken() {
      this.graph = [];
      this.graph.push(this.selectedTocken?.price);
    },
  },
  computed: {
    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page,
      };
    },
    filteredList() {
      return this.tickers.filter((t) =>
        t.name.includes(this.filter.toUpperCase())
      );
    },
    firstTickerOnPage() {
      return (this.page - 1) * 6;
    },
    lastTickerOnPage() {
      return this.page * 6;
    },
    hasNextPage() {
      return this.filteredList.length > this.lastTickerOnPage;
    },
    filteredTickers() {
      return this.filteredList.slice(
        this.firstTickerOnPage,
        this.lastTickerOnPage
      );
    },
  },

  methods: {
    graphLength(max) {
      this.maxGraphElem = max;
      if (this.graph.length - this.maxGraphElem > 0) {
        this.graph.splice(0, this.graph.length - this.maxGraphElem);
      }
    },
    formatedPrice(price) {
      if (price === "-") return price;
      return price < 1 ? price.toPrecision(2) : price.toFixed(2);
    },

    updateTickerPrice(ticker, newPrice) {
      if (ticker.price !== newPrice) {
        ticker.price = newPrice;
        if (this.selectedTocken === ticker) {
          this.graph.push(newPrice);
          if (this.graph.length - this.maxGraphElem > 0) {
            this.graph.splice(0, this.graph.length - this.maxGraphElem);
          }
        }
      }
    },

    createTickerUpdater(ticker) {
      const updateTikerFn = (newPrice) => {
        this.updateTickerPrice(ticker, newPrice);
      };
      subscribeToTicker(ticker.name, updateTikerFn);
      return updateTikerFn;
    },

    add(ticker) {
      if (this.tickers.find((t) => t.name === ticker)) {
        this.isContaine = true;
        return;
      }
      const currentTicker = {
        name: ticker,
        price: "-",
      };
      currentTicker.updateTikerFn = this.createTickerUpdater(currentTicker);
      this.tickers = [...this.tickers, currentTicker];
      console.log(" - currentTicker:318 >", currentTicker); // eslint-disable-line no-console
    },

    remove(removedTicker) {
      this.tickers = this.tickers.filter((t) => t !== removedTicker);
      unsubscribeFromTicker(removedTicker.name, removedTicker.updateTikerFn);
      if (this.selectedTocken === removedTicker) this.selectedTocken = null;
    },
    selectTocken(tocken) {
      this.selectedTocken = tocken;
    },
    close() {
      this.selectedTocken = null;
    },
  },
};
</script>
