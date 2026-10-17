LC.sim({
  id: "sim-mov", title: "Recipe select with MOV", level: 3, lesson: "plc-compare-math",
  brief: `A paint mixer runs three recipes. The recipe table holds, for each recipe number **1 to 3**, a **mix temperature** (REAL, deg C) and a **mix speed** (DINT, RPM). When the operator selects a recipe with \`RecipeSel\` and presses \`LoadBtn\`, the controller copies that recipe's values into the **active setpoints** \`SetTemp\` and \`SetSpeed\`.

The tables are already filled in:

| Recipe | \`RecipeTemp[n]\` | \`RecipeSpeed[n]\` |
|---|---|---|
| 1 | 65.5 | 30 |
| 2 | 72.0 | 45 |
| 3 | 80.5 | 60 |

Requirements:

- Nothing changes until \`LoadBtn\` is pressed.
- Pressing Load copies **both** values for the chosen recipe, using **MOV** with the recipe number as the array **index**: \`MOV(RecipeTemp[RecipeSel],SetTemp)\`.
- If \`RecipeSel\` is not 1, 2 or 3, Load must leave the setpoints alone. Guard with **LIM**.

\`\`\`ladder
XIC(LoadBtn)MOV(RecipeTemp[RecipeSel],SetTemp);
\`\`\``,
  tags: {
    RecipeSel: { type: "DINT", desc: "Selected recipe number (1 to 3)" }, LoadBtn: "BOOL",
    RecipeTemp: { type: "REAL[4]", desc: "Mix temperature per recipe (index 0 unused)" },
    RecipeSpeed: { type: "DINT[4]", desc: "Mix speed per recipe, RPM (index 0 unused)" },
    SetTemp: { type: "REAL", desc: "Active temperature setpoint" }, SetSpeed: { type: "DINT", desc: "Active speed setpoint" }
  },
  init: { "RecipeTemp[1]": 65.5, "RecipeTemp[2]": 72, "RecipeTemp[3]": 80.5, "RecipeSpeed[1]": 30, "RecipeSpeed[2]": 45, "RecipeSpeed[3]": 60, SetTemp: 20, SetSpeed: 0 },
  io: [
    { tag: "RecipeSel", widget: "slider", label: "Recipe number", min: 0, max: 5, step: 1, init: 1 },
    { tag: "LoadBtn", widget: "pb", label: "Load recipe" },
    { tag: "SetTemp", widget: "value", label: "Active temp", unit: "C", dec: 1 },
    { tag: "SetSpeed", widget: "value", label: "Active speed", unit: "RPM", dec: 0 }
  ],
  palette: ["XIC", "XIO", "OTE", "EQU", "LIM", "MOV", "BRANCH"],
  requires: ["MOV", "LIM"],
  starter: "XIC(LoadBtn)MOV(RecipeTemp[1],SetTemp);",
  tests: [
    { name: "Nothing is loaded until Load is pressed", steps: [{ set: { RecipeSel: 2 } }, { scan: 5 }, { expect: { SetTemp: 20, SetSpeed: 0 } }] },
    { name: "Loading recipe 1 copies temperature and speed", steps: [{ set: { RecipeSel: 1 } }, { press: { tag: "LoadBtn", ms: 200 } }, { wait: 100 }, { expect: { SetTemp: 65.5, SetSpeed: 30 } }] },
    { name: "Loading recipe 3 copies recipe 3 values", steps: [{ set: { RecipeSel: 3 } }, { press: { tag: "LoadBtn", ms: 200 } }, { wait: 100 }, { expect: { SetTemp: 80.5, SetSpeed: 60 } }] },
    { name: "Switching recipes replaces the earlier setpoints", steps: [{ set: { RecipeSel: 3 } }, { press: { tag: "LoadBtn", ms: 200 } }, { wait: 100 }, { set: { RecipeSel: 2 } }, { scan: 3 }, { expect: { SetTemp: 80.5, SetSpeed: 60 } }, { press: { tag: "LoadBtn", ms: 200 } }, { wait: 100 }, { expect: { SetTemp: 72, SetSpeed: 45 } }] },
    { name: "An invalid recipe number leaves the setpoints alone", steps: [{ set: { RecipeSel: 2 } }, { press: { tag: "LoadBtn", ms: 200 } }, { wait: 100 }, { set: { RecipeSel: 5 } }, { press: { tag: "LoadBtn", ms: 200 } }, { wait: 100 }, { expect: { SetTemp: 72, SetSpeed: 45 } }, { set: { RecipeSel: 0 } }, { press: { tag: "LoadBtn", ms: 200 } }, { wait: 100 }, { expect: { SetTemp: 72, SetSpeed: 45 } }] }
  ],
  hints: [
    "The starter always copies recipe 1. The recipe number is itself a tag, so it can be used inside the square brackets of the array: the controller then picks the element at run time.",
    "Use \`MOV(RecipeTemp[RecipeSel],SetTemp)\` and \`MOV(RecipeSpeed[RecipeSel],SetSpeed)\`. Put both MOVs on the same rung after \`XIC(LoadBtn)\`, since a MOV passes power on. Add a \`LIM(1,RecipeSel,3)\` before them so a bad number is ignored.",
    "\`XIC(LoadBtn)LIM(1,RecipeSel,3)MOV(RecipeTemp[RecipeSel],SetTemp)MOV(RecipeSpeed[RecipeSel],SetSpeed);\`"
  ],
  solution: "XIC(LoadBtn)LIM(1,RecipeSel,3)MOV(RecipeTemp[RecipeSel],SetTemp)MOV(RecipeSpeed[RecipeSel],SetSpeed);",
  explain: `**MOV(Source, Dest)** copies the source value into the destination whenever its rung is true. It is an output instruction that passes power on, so several MOVs can follow one another on the same rung and all run together.

Here the source is an array element addressed by **another tag**: \`RecipeTemp[RecipeSel]\`. This is **indirect addressing**. On each scan the controller reads \`RecipeSel\`, finds that element and copies it. One rung replaces a separate rung for each recipe. Recipe tables in real machines are often a UDT array with dozens of recipes; the logic does not grow.

Why the **LIM**? If the index is outside the array, Logix doesn't copy anything useful: the instruction sets a **major fault** (type 4, code 20, array subscript too large) and the controller can stop. Index 0 here is valid but means "no recipe", which would copy zeros. LIM(1,RecipeSel,3) blocks both before the MOV runs. The simulator is kinder than a real controller: it flags the rung and carries on.

Notice the types. \`SetTemp\` is a REAL and \`SetSpeed\` is a DINT, the same types as their sources, so the copy is exact. MOVing a REAL into a DINT **rounds** to the nearest whole number, and MOVing a large DINT into a smaller integer type can overflow. Choose destination types on purpose.

In Studio 5000, copying a whole recipe at once is usually done with **COP** (copy file) from a UDT array element to the active-recipe tag, as the lesson shows. MOV is for single values.`,
  tips: [
    "Always range-check an index tag before it is used in brackets. An out-of-range subscript is a major fault in a real controller, and the controller stops the program.",
    "A MOV runs every scan while its rung is true. A held Load button re-copies the recipe each scan, which would overwrite an operator tweak. If that matters, add an ONS so it copies once per press.",
    "Keep operator-editable setpoints and recipe tables in separate tags, as here, so a bad edit to the active value never destroys the stored recipe.",
    "For anything that has to be changed 'at once' (a whole recipe), prefer COP of a UDT over many MOVs, so a scan never sees half of the old recipe and half of the new."
  ]
});
