import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import dynamic from "next/dynamic";
import CircularProgress from "@mui/material/CircularProgress";
import { DEFAULT_TEST_DATA } from "./components/dapp-context";
import { Config } from "./components/config";
import { CreateForm } from "./components/create-form";
import {
  FormField,
  FormError,
  FormTextField,
  FormSelect,
  FormDatePicker,
  FormDropZone,
  FormCheckbox,
} from "./components/forms";
import { PLASMIC_PROJECT_ID, PLASMIC_PROJECT_API_TOKEN } from "./lib/config";
import ClaimAllFractionsButton from "./components/claim-all-fractions-button";
import { Tooltip, Accordion } from "./components/widgets";

export const PLASMIC = initPlasmicLoader({
  projects: [
    // Hypercerts DApp
    {
      id: PLASMIC_PROJECT_ID,
      token: PLASMIC_PROJECT_API_TOKEN,
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});

/**
 * Plasmic component registration
 *
 * For more details see:
 * https://docs.plasmic.app/learn/code-components-ref/
 */

PLASMIC.registerComponent(Config, {
  name: "Config",
  description: "Expose app config",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
  },
  providesData: true,
  importPath: "./components/config",
});

PLASMIC.registerComponent(
  dynamic(() => import("./components/dapp-context"), { ssr: false }),
  {
    name: "DappContext",
    description: "This must wrap anything that uses wallet functionality",
    props: {
      children: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Placeholder",
        },
      },
      notConnected: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Placeholder",
        },
      },
      showIfNotConnected: "boolean",
      testData: {
        type: "object",
        defaultValue: DEFAULT_TEST_DATA,
        editOnly: true,
      },
      useTestData: {
        type: "boolean",
        editOnly: true,
      },
    },
    providesData: true,
    importPath: "./components/dapp-context",
  },
);

PLASMIC.registerComponent(
  dynamic(() => import("./components/connect-wallet"), { ssr: false }),
  {
    name: "ConnectWallet",
    description: "The connect wallet button",
    props: {},
    importPath: "./components/connect-wallet",
  },
);

PLASMIC.registerComponent(CreateForm, {
  name: "CreateForm",
  description: "Create a hypercert",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
  },
  providesData: true,
  importPath: "./components/create-form",
});

PLASMIC.registerComponent(FormError, {
  name: "FormError",
  description: "Displays the error associated with fieldName",
  props: {
    fieldName: "string",
  },
  importPath: "./components/forms",
});

PLASMIC.registerComponent(FormField, {
  name: "FormField",
  description: "General purpose form field that accepts an arbitrary input",
  props: {
    fieldName: "string",
    children: "slot",
  },
  importPath: "./components/forms",
});

PLASMIC.registerComponent(FormTextField, {
  name: "FormTextField",
  description: "Textfield for forms",
  props: {
    fieldName: "string",
    label: "string",
    placeholder: "string",
    rows: "number",
  },
  importPath: "./components/forms",
});

PLASMIC.registerComponent(FormSelect, {
  name: "FormSelect",
  description: "Select box for forms",
  props: {
    fieldName: "string",
    label: "string",
    optionValues: {
      type: "object",
      defaultValue: ["a", "b"],
    },
    multiple: "boolean",
    disabled: "boolean",
  },
  importPath: "./components/forms",
});

PLASMIC.registerComponent(FormDatePicker, {
  name: "FormDatePicker",
  description: "Date picker for forms",
  props: {
    fieldName: "string",
    label: "string",
    showUndefined: "boolean",
    defaultUndefined: "boolean",
    disabled: "boolean",
  },
  importPath: "./components/forms",
});

PLASMIC.registerComponent(FormDropZone, {
  name: "FormDropZone",
  description: "DropZone for forms",
  props: {
    fieldName: "string",
    children: "slot",
    accept: "string",
  },
  importPath: "./components/forms",
});

PLASMIC.registerComponent(FormCheckbox, {
  name: "FormCheckbox",
  description: "Checkbox for forms",
  props: {
    fieldName: "string",
  },
  importPath: "./components/forms",
});

PLASMIC.registerComponent(Tooltip, {
  name: "Tooltip",
  props: {
    title: "string",
    children: "slot",
  },
  importPath: "./components/widgets",
});

PLASMIC.registerComponent(Accordion, {
  name: "Accordion",
  props: {
    summary: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
  },
  importPath: "./components/widgets",
});

PLASMIC.registerComponent(CircularProgress, {
  name: "CircularProgress",
  description: "Circular loading widget",
  props: {},
  importPath: "@mui/material/CircularProgress",
});

PLASMIC.registerComponent(ClaimAllFractionsButton, {
  name: "ClaimAllFractionsButton",
  description: "Button that will claim all fractions upon clicking",
  props: {
    text: "string",
    disabled: "boolean",
  },
  importPath: "./components/claim-all-fractions-button",
});
