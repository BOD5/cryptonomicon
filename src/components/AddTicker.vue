<template>
  <div class="flex">
    <div class="max-w-xs">
      <label for="wallet" class="block text-sm font-medium text-gray-700"
        >Тикер</label
      >
      <div class="mt-1 relative rounded-md shadow-md">
        <input
          v-model="ticker"
          @input="writeTicker"
          @keyup.enter="add"
          type="text"
          name="wallet"
          id="wallet"
          class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
          placeholder="Например DOGE"
        />
      </div>
      <div
        v-if="help.length > 0"
        class="flex bg-white shadow-md p-1 rounded-md flex-wrap"
      >
        <span
          v-for="(h, idx) in help"
          :key="idx"
          @click="selectHelp(h)"
          class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
        >
          {{ h }}
        </span>
      </div>
      <div v-if="isContaine" class="text-sm text-red-600">
        Такой тикер уже добавлен
      </div>
    </div>
  </div>

  <add-button @click="add" class="my-4" />
</template>

<script>
import AddButton from "./AddButton.vue";

export default {
  components: {
    AddButton,
  },
  data() {
    return {
      ticker: "",
      help: [],
    };
  },

  props: {
    tickerList: {
      type: Object,
      required: false,
      default: () => {},
    },
    isContaine: {
      type: Boolean,
      required: false,
      deffault: false,
    },
  },

  emits: {
    "change-is-containe": (value) => typeof value === "boolean",
    "add-ticker": (value) => typeof value === "string" && value.length > 0,
  },

  methods: {
    add() {
      if (this.ticker.length === 0) {
        return;
      }
      const tickerName = this.ticker.toUpperCase();
      this.$emit("add-ticker", tickerName);
      this.$nextTick().then(() => {
        if (this.isContaine) {
          return;
        }
        this.ticker = "";
        this.help = [];
      });
    },
    writeTicker() {
      const name = this.ticker.toUpperCase();
      if (this.isContaine) this.$emit("change-is-containe", false);
      this.help =
        name === ""
          ? []
          : Object.keys(this.tickerList)
              .filter((tk) => {
                return tk.indexOf(`${name}`) !== -1;
              })
              .slice(0, 4);
    },
    selectHelp(h) {
      this.ticker = h;
      this.add();
    },
  },
};
</script>
