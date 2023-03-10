// Whether or not to restore the VM state from a file. Set to false to perform a regular boot.
let restoreState = true

// Run a command via the serial port (/dev/ttyS0) and return the output.
// This is not the same console as displayed in the browser (that's /dev/console).
// This function is available from the console!
function run(cmd) {
    emulator.serial0_send(cmd + "\n")

    return new Promise((resolve, reject) => {
        var output = ""
        var listener = (char) => {
            if (char !== "\r") {
                output += char
            }

            if (output.endsWith("# ")) {
                emulator.remove_listener("serial0-output-char", listener)
                let outputWithoutPrompt = output.slice(0, -4)
                let outputWithoutFirstLine = outputWithoutPrompt.slice(
                    outputWithoutPrompt.indexOf("\n") + 1
                )
                if (outputWithoutFirstLine.endsWith("\n")) {
                    outputWithoutFirstLine = outputWithoutFirstLine.slice(0, -1)
                }
                emulator.remove_listener("serial0-output-char", listener)
                resolve(outputWithoutFirstLine)
            }
        }
        emulator.add_listener("serial0-output-char", listener)
    })
}
window.run = run

// Run a test command and return true if the exit code is 0, false otherwise.
async function test(condition) {
    let result = await run(`test ${condition} && echo 'yes' || echo 'no'`)
    return result == "yes"
}

// Set emulator config.
let config = {
    wasm_path: "lib/v86.wasm",
    memory_size: 64 * 1024 * 1024,
    vga_memory_size: 2 * 1024 * 1024,
    screen_container: document.getElementById("screen_container"),
    bios: {url: "images/seabios.bin"},
    vga_bios: {url: "images/vgabios.bin"},
    cdrom: {url: "images/image.iso"},
    disable_mouse: true,
    autostart: true,
}
if (restoreState) {
    config.initial_state = {
        url: "images/booted-state.bin.zst",
    }
}

// Start the emulator!
var emulator = (window.emulator = new V86Starter(config))

// Wait for the emulator to start, then run init().
var interval = setInterval(() => {
    if (emulator.is_running()) {
        clearInterval(interval)
        init()
    }
}, 100)

// Allow saving and restoring the state using the buttons below the console.
var state
document.getElementById("save_restore").onclick = async function () {
    var button = this

    if (state) {
        button.value = "Save state"
        await emulator.restore_state(state)
        state = undefined
    } else {
        const new_state = await emulator.save_state()
        console.log("Saved state of " + new_state.byteLength + " bytes")
        button.value = "Restore state"
        state = new_state
    }

    button.blur()
}
document.getElementById("save_file").onclick = async function () {
    const new_state = await emulator.save_state()
    var a = document.createElement("a")
    a.download = "v86state.bin"
    a.href = window.URL.createObjectURL(new Blob([new_state]))
    a.dataset.downloadurl =
        "application/octet-stream:" + a.download + ":" + a.href
    a.click()

    this.blur()
}
document.getElementById("restore_file").onchange = function () {
    if (this.files.length) {
        var filereader = new FileReader()
        emulator.stop()

        filereader.onload = async function (e) {
            await emulator.restore_state(e.target.result)
            emulator.run()
        }

        filereader.readAsArrayBuffer(this.files[0])

        this.value = ""
    }

    this.blur()
}

// This is run after the emulator loads.
async function init() {
    if (window.location.search == "") {
        await nextLevel()
    } else {
        // Remove empty URL parameters.
        let params = new URLSearchParams(window.location.search)
        let toDelete = []
        for (let [key, value] of params) {
            if (value == "") {
                toDelete.push(key)
            }
        }
        for (let key of toDelete) {
            params.delete(key)
        }
        window.history.replaceState({}, "", "?" + params.toString())

        currentLevel = 0
        level = {}
        if (params.get("task")) {
            level.task = params.get("task")
        }
        if (params.get("setup")) {
            level.setup = params.get("setup")
        }
        if (params.get("tools")) {
            level.tools = params
                .get("tools")
                .split(",")
                .map((x) => x.trim())
        }
        if (params.get("searches")) {
            level.searches = params
                .get("searches")
                .split(",")
                .map((x) => x.trim())
        }
        levels[0] = level
        loadLevel(0)
    }
}

let levels = []

levels.push({
    task: 'This is a fully-functional Linux, running entirely in your browser, powered by <a href="https://github.com/copy/v86" target="_blank">v86</a>!<br><br>Here\'s your first challenge: Read the file called <b>readme</b>, and paste its content in the box below.<br><br>If you\'re not using a QWERTY keyboard, you can set your keyboard layout like this: <code>loadkeys de</code>.',
    setup: "echo FLAG > readme",
    tools: ["loadkeys", "ls", "cat"],
})

levels.push({
    task: "Read the file called <b>spaces in this filename</b>.",
    setup: "echo FLAG > 'spaces in this filename'",
    tools: ["ls", "cat"],
})

levels.push({
    task: "Find and read the hidden file.",
    setup: "echo FLAG > .hidden",
    tools: ["ls", "cat"],
    searches: ["linux hidden files"],
})

levels.push({
    task: "Read the file called <b>-</b>",
    setup: "echo FLAG > -",
    tools: ["ls", "cat"],
    searches: ["filename with dash"],
})

levels.push({
    task: "Find the only line in <b>haystack</b> that occurs twice.",
    setup: `seq 1 5 | xargs -I{} sh -c "echo {} | md5sum | cut -d' ' -f1 >> haystack"
                echo FLAG >> haystack
                seq 10 17 | xargs -I{} sh -c "echo {} | md5sum | cut -d' ' -f1 >> haystack"
                echo FLAG >> haystack
                seq 20 23 | xargs -I{} sh -c "echo {} | md5sum | cut -d' ' -f1 >> haystack"
                `,
    tools: ["ls", "cat", "sort", "uniq"],
})

levels.push({
    task: "Find the file in the Git repository <b>repo</b> that was deleted in the last commit.",
    setup: `mkdir repo
                    cd repo
                    git config --global init.defaultBranch main
                    git config --global user.name 'Me'
                    git config --global user.email 'test@example.com'
                    git config core.pager cat
                    git init
                    echo FLAG > flag
                    echo "The flag was deleted, ha ha! >:}" > this_is_not_the_flag
                    git add .
                    git commit -m 'Add flag'
                    git rm flag
                    git commit -m 'Delete flag'
                    cd ..
                `,
    tools: ["cd", "ls", "git-checkout"],
})

levels.push({
    task: "Find the process ID of the <code>kswapd0</code> process.",
    solution: "pidof kswapd0",
    tools: ["ps", "pidof"],
})

levels.push({
    task: "Find the version of the Linux kernel.",
    solution: "uname -r",
    tools: ["uname"],
})

levels.push({
    task: "Well done, you solved all levels of this technical demo!<br><br>Because this Linux runs in a VM, you can try more things, without breaking anything.<br><br>For example, didn't you always want to try running <code>rm -rf /</code>? How much can you actually delete? What should you delete last? :D Good luck!<br><br>You can use the arrow buttons at the top to change to other levels.",
    solution: "echo unknowable",
    tools: ["lsof", "ps", "kill"],
})

let currentLevel = -1

async function nextLevel() {
    currentLevel = (currentLevel + 1) % levels.length
    window.history.replaceState({}, "", window.location.pathname)
    await loadLevel(currentLevel)
}

async function prevLevel() {
    currentLevel = (currentLevel - 1 + levels.length) % levels.length
    window.history.replaceState({}, "", window.location.pathname)
    await loadLevel(currentLevel)
}

async function loadLevel(i) {
    let level = levels[i]

    document.getElementById("level_task").value = level.task || ""
    document.getElementById("level_setup").value = level.setup || ""
    document.getElementById("level_tools").value = level.tools || ""
    document.getElementById("level_searches").value = level.searches || ""
    document.getElementById("level_solution").value = level.solution || ""

    if (!level.task) {
        level.task = "(No description provied.)"
    }

    await run("cd /root")

    if (level.solution) {
        level["flag"] = await run(level.solution)
    } else {
        level["flag"] = await run("date | md5sum | cut -d' ' -f1")
    }

    if (level.setup) {
        await run(level.setup.replaceAll("FLAG", level["flag"]))
    }

    if (window.location.search == "") {
        document.getElementById("title").innerHTML =
            "Level " + (currentLevel + 1)
    } else {
        document.getElementById("title").innerHTML = "Custom level"
    }
    document.getElementById("description").innerHTML =
        "<p>" + level.task + "</p>"
    if (level.tools) {
        document.getElementById("description").innerHTML +=
            "<h3>Useful commands</h3>"
        for (let tool of level.tools) {
            document.getElementById(
                "description"
            ).innerHTML += `<a href="https://man7.org/linux/man-pages/man1/${tool}.1.html" target="_blank">${tool}</a> `
        }
    }
    if (level.searches) {
        document.getElementById("description").innerHTML +=
            "<h3>Helpful web searches</h3>"
        for (let query of level.searches) {
            document.getElementById(
                "description"
            ).innerHTML += `<a href="https://duckduckgo.com/?q=${query}" target="_blank">${query}</a> `
        }
    }
    document.getElementById("flag").value = ""
}

document.getElementById("prev").onclick = async function () {
    await prevLevel()
}

document.getElementById("next").onclick = async function () {
    await nextLevel()
}

document.getElementById("submit").onclick = async function () {
    let flag = document.getElementById("flag").value
    let level = levels[currentLevel]
    if (flag == level.flag) {
        alert("Correct :) Let's go to the next level!")
        await nextLevel()
    } else {
        alert("Wrong solution.")
    }
}

document.getElementById("flag").onkeydown = async function (e) {
    if (e.key == "Enter") {
        document.getElementById("submit").click()
    }
}

document.getElementById("make-own").onclick = async function (e) {
    document.getElementById("popup").style.display = "flex"
}

document.getElementById("popup-close").onclick = async function (e) {
    document.getElementById("popup").style.display = "none"
}

document.getElementById("popup").onclick = async function (e) {
    document.getElementById("popup").style.display = "none"
}

document.getElementById("popup-background").onclick = async function (e) {
    e.stopPropagation()
}

document.getElementById("clear").onclick = async function (e) {
    document.getElementById("level_task").value = ""
    document.getElementById("level_setup").value = ""
    document.getElementById("level_tools").value = ""
    document.getElementById("level_searches").value = ""
    document.getElementById("level_solution").value = ""
}
