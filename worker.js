for (const tab of tabs) {
    on(`clicked:show_tab_${tab.name}`, () => {
        setAttrs({
            "activeTab": tab.name
        });
    });
}

for (const group of perks) {
    for (const perk of group.list) {
        const perkName = perk.name.replace(/[\W]/g, "")
        on(`clicked:selectPerk_${perkName}`, () => {
            addPerk(perkName, perk.name, group.name, perk.info[0])
        })
    }
}

function displayPerkGroup(groupName) {
    setAttrs({
        "perkListSelect": groupName
    });
}

function concatActivePerks(arr) {
    return (";" + arr.join(";") + ";").replace(/;+/g, ";")
}

function addPerk(perkName, displayName, groupName, summary) {
    getAttrs(["activePerks"], (value) => {
        const arr = value.activePerks.split(";")
        if (arr.indexOf(perkName) === -1) {
            arr.push(perkName)
            const rowId = generateRowID()
            setAttrs({
                [`repeating_activeperks_${rowId}_perkdisplayname`]: displayName,
                [`repeating_activeperks_${rowId}_perkname`]: perkName,
                [`repeating_activeperks_${rowId}_groupname`]: groupName,
                [`repeating_activeperks_${rowId}_details`]: summary,
                "activePerks": concatActivePerks(arr)
            })
        }
    })
}

function removePerk(perkName) {
    getAttrs(["activePerks"], (value) => {
        const arr = value.activePerks.split(";")
        const index = arr.indexOf(perkName)
        if (index > -1) {
            arr.splice(index, 1)
            setAttrs({
                "activePerks": concatActivePerks(arr)
            })
        }
    })
}



on("clicked:repeating_activeperks:displaybtn", (repeatEvent) => {
    let [buttonName, row, section, field] = repeatEvent.triggerName.match(/((repeating_[^_]+?)_([^_]+?))_(.+)/);
    const prefix = "repeating_activeperks_" + field + "_"
    const groupkey = `${prefix}groupname`
    const perkkey = `${prefix}perkname`
    getAttrs([groupkey, perkkey], (values) => {
        setAttrs({
            "activeTab": "perks",
            "perkListSelect": values[groupkey],
            [`perkList_${values[groupkey]}`]: values[perkkey]
        })
    })
});

on("clicked:repeating_activeperks:removebtn", (repeatEvent) => {
    let [buttonName, row, section, field] = repeatEvent.triggerName.match(/((repeating_[^_]+?)_([^_]+?))_(.+)/);
    const prefix = "repeating_activeperks_" + field + "_"
    const perkkey = `${prefix}perkname`
    getAttrs([perkkey], (values) => {
        removePerk(values[perkkey])
        removeRepeatingRow("repeating_activeperks_" + field)
    })
});

on("clicked:repeating_actions:edititem", () => {
    const key = `repeating_actions_editing`
    getAttrs([key], values => {
        const val = values[key] === "true" ? "false" : "true"
        setAttrs({[key]: val})
    })
})

for (const icon of icons) {
    on("clicked:repeating_actions:icon" + icon, () => {
        setAttrs({"repeating_actions_icon": `<span>${icon}</span>`})
    })
}


function templateR2R(values, queryModifier) {
    let output = `&{template:R2R}`
    Object.keys(values).forEach(key => {
        output = `${output} {{${key}=${values[key]}}}`
    })
    return output
}

function pseudoRoll(roll) {
    return roll.replace(/\b\d*[Dd]\d+(\[.*\])?/g, function(match, trail) {
        const vals = match.split(/[Dd\[]/)
        const count = Number(vals[0])
        const sides = Number(vals[1])
        if (isNaN(count) || count <= 1) {
            return `[[${die(sides)}${(trail || "")}]]`
        }

        const output = []
        for (let i = 0; i < count; i++) {
            output.push(die(sides) + (trail || ""))
        }
        return `([[${output.join(`]]+[[`) }]])`
    })
}

function die(sides) {
    return 1 + Math.floor(crypto.getRandomValues(new Uint8Array(1))[0]  * sides/256)
}

on("clicked:repeating_actions:roll", () => {
    getAttrs(["roll","title","subtitle","success","partial","failure"].map(a => "repeating_actions_" + a), async function(values) {
        const txt = pseudoRoll(values.repeating_actions_roll);
        const temp = templateR2R({
            roll: txt, 
            result: `[[${txt}]]`,
            title: values.repeating_actions_title,
            subtitle: values.repeating_actions_subtitle,
            success: values.repeating_actions_success,
            partial: values.repeating_actions_partial,
            failure: values.repeating_actions_failure,  
        })
        const roll = await startRoll(temp)
        finishRoll(roll.rollId, {})
    })
})

on("clicked:repeating_actions:modup", () => {
    getAttrs(["repeating_actions_mod"], (values) => {
        const val = Number(values.repeating_actions_mod)
        setAttrs({repeating_actions_mod: val + 1})
    })
})

on("clicked:repeating_actions:moddn", () => {
    getAttrs(["repeating_actions_mod"], (values) => {
        const val = Number(values.repeating_actions_mod)
        setAttrs({repeating_actions_mod: val - 1})
    })
})

const spinnerList = [{
    name: "stat_points"
}]
for (const stat of stats) {
    const spin = {
        name: stat,
        min: -2
    }
    spin.upCheck = function (callback) {
        getAttrs(["stat_points"], (values) => {
            if (Number(values.stat_points) > 0) {
                setAttrs({
                    "stat_points": Number(values.stat_points) - 1
                }, callback)
            }
        })
    }
    spin.dnCheck = function (callback) {
        getAttrs([stat, `${stat}_buff`], (values) => {
            const statVal = Number(values[stat])
            const buffVal = Number(values[`${stat}_buff`])
            if (statVal - buffVal > -2) {
                callback()
            }
        })
    }
    spin.dnFn = () => {
        getAttrs(["stat_points"], (values) => {
            setAttrs({
                "stat_points": Number(values.stat_points) + 1
            })
        })
    }
    spinnerList.push(spin)

    const spinBuff = {
        name: `${stat}_buff`
    }
    spinBuff.upFn = () => {
        getAttrs([stat], (values) => {
            let val = Number(values[stat])
            setAttrs({
                [stat]: val + 1
            })
        })
    }
    spinBuff.dnFn = () => {
        getAttrs([stat], (values) => {
            let val = Number(values[stat])
            setAttrs({
                [stat]: val - 1
            })
        })
    }
    spinnerList.push(spinBuff)
}

for (const vit of vits) {
    spinnerList.push({
        name: vit.name,
        min: vit.min,
        max: vit.max
    })
    spinnerList.push({
        name: `${vit.name}_max`,
        min: vit.min,
        max: vit.max,
        dnFn: () => {
            getAttrs([vit.name, `${vit.name}_max`], (values) => {
                if (Number(values[vit.name]) > Number(values[`${vit.name}_max`])) {
                    setAttrs({
                        [vit.name]: Number(values[`${vit.name}_max`])
                    })
                }
            })
        }
    })
}

for (const spin of spinnerList) {
    const attrs = [spin.name]
    if (spin.max !== void 0 && isNaN(Number(spin.max))) {
        attrs.push(spin.max)
    }
    if (spin.max !== void 0 && isNaN(Number(spin.min))) {
        attrs.push(spin.min)
    }

    spin.upFn = spin.upFn || function () {};
    spin.dnFn = spin.dnFn || function () {};

    const increase = (val) => setAttrs({
        [spin.name]: val + 1
    }, spin.upFn)
    const decrease = (val) => setAttrs({
        [spin.name]: val - 1
    }, spin.dnFn)

    on(`clicked:${spin.name}up`, function () {
        getAttrs(attrs, (values => {
            let val = Number(values[spin.name])
            if (spin.upCheck !== undefined) {
                spin.upCheck(() => increase(val))
            } else if (values[spin.max] !== void 0) {
                if (val < Number(values[spin.max])) {
                    increase(val)
                }
            } else if (spin.max !== void 0) {
                if (val < Number(spin.max)) {
                    increase(val)
                }
            } else {
                increase(val)
            }
        }))
    })
    on(`clicked:${spin.name}dn`, function () {
        getAttrs(attrs, (values => {
            let val = Number(values[spin.name])
            if (spin.dnCheck !== undefined) {
                spin.dnCheck(() => decrease(val))
            } else if (values[spin.min] !== undefined) {
                if (val > Number(values[spin.min])) {
                    decrease(val)
                }
            } else if (spin.min !== undefined) {
                if (val > Number(spin.min)) {
                    decrease(val)
                }
            } else {
                decrease(val)
            }
        }))
    })
}