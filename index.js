

const pug = require("pug");
const fs = require("fs");
const sass = require("sass");

const operators = ["+","-","*","/","%"]
const modText = "?{Modifier|0,+ 0|+1, + 1|+2, + 2|+3,+ 3|+4,+ 4|+5,+ 5|+6,+ 6|+7,+ 7|-1,- 1|-2,- 2|-3,- 3|-4,- 4|-5,- 5|-6,- 6|-7,- 7|100% Sucesss,+ 24|100% Fail,- 24}"

function getResource(name) {
    const text = fs.readFileSync(`resources/${name}.json`)
    const obj = JSON.parse(text, (key, value) => {
        if (key === "list") {
            return Array.from(value)
        } else {
            return value
        }
    })
    return Array.from(obj)
}

function reduce(resource, deep) {
    const output = []
    if (deep === true) {
        for (const group of Array.from(resource)) {
            for (const item of Array.from(group.list)) {
                output.push(item.name.replace(/\W+/g,""))
            }
        }
    } else {
        for (const group of Array.from(resource)) {
            output.push(group.name.replace(/\W+/g,""))
        }
    }
    return output.join(", ")
}

const actions = getResource("actions")
const perks = getResource("perks")
const stats = getResource("stats")
const vits = getResource("vits")
const tabs = getResource("tabs")

const icons = JSON.parse(fs.readFileSync("resources/icons.json"))
function concatIcons(scss) {
    let output = []
    for (const [key, val] of Object.entries(icons)) {
        output.push(...val)
    }
    return scss ? `("${output.join(`","`)}")` : output
}

const data = {
    actions: Array.from(actions),
    perks: Array.from(perks),
    stats: Array.from(stats),
    vits: Array.from(vits),
    tabs: Array.from(tabs),
    icons: icons
}

function workerText() {
    return [
        `const iconGroups = ${JSON.stringify(Object.keys(icons))}`,
        `const icons = ${JSON.stringify(concatIcons())};`,
        `const vits = ${JSON.stringify(vits)};`,
        `const perks = ${JSON.stringify(perks)};`,
        `const actions = ${JSON.stringify(actions)};`,
        `const tabs = ${JSON.stringify(tabs)};`,
        `const stats = ${JSON.stringify(stats)};`,
        fs.readFileSync("worker.js")
    ].join("\n\n")
}

const html = pug.compileFile("r2r.pug", {pretty: true})(data)
fs.writeFileSync("dist/out.html", html + `\n<script type="text/worker">\n${workerText()}\n</script>`)


const scssText = [
    `$icons: ${concatIcons(true)};`,
    `$perks: ${reduce(perks, true)};`,
    `$actions: ${reduce(actions, true)};`,
    `$perkGroups: ${reduce(perks)};`,
    `$actionGroups: ${reduce(actions)};`,
    `$iconGroups: ${Object.keys(icons).join(",")};`,
    `$tabs: ${tabs.map(tab => tab.name).join(", ")};`,
    fs.readFileSync("main.scss"),
    fs.readFileSync("rpgawesome.scss")
].join("\n\n")


fs.writeFileSync("dist/out.css", sass.renderSync({data: scssText}).css.toString())