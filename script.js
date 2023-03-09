let restoreState = true
let emulator

function run(cmd) {
    emulator.serial0_send(cmd + "\n")

    return new Promise((resolve, reject) => {
        var output = ""
        var listener = (char) => {
            if (char !== "\r") {
                output += char
            }

            //document.getElementById("output").textContent += char
            document.getElementById("output").scrollTop =
                document.getElementById("output").scrollHeight

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

async function test(condition) {
    let result = await run(`test ${condition} && echo 'yes' || echo 'no'`)
    return result == "yes"
}

window.onload = function () {
    let config = {
        wasm_path: "v86.wasm",
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        screen_container: document.getElementById("screen_container"),
        serial_container_xtermjs: document.getElementById("output"),
        bios: {
            url: "seabios.bin",
        },
        vga_bios: {
            url: "vgabios.bin",
        },
        cdrom: {
            url: "image.iso",
        },
        disable_mouse: true,
        autostart: true,
    }

    if (restoreState) {
        config.initial_state = {
            url: "booted-state.bin.zst",
        }
    }

    emulator = window.emulator = new V86Starter(config)
    // check if the emulator is running every 100 ms. If it is, call run() and stop the checking
    var interval = setInterval(() => {
        if (emulator.is_running()) {
            clearInterval(interval)
            init()
        }
    }, 100)

    async function init() {
        await nextLevel()
    }

    var data = ""

    document.getElementById("command").onkeydown = async function (e) {
        if (e.which == 13) {
            var code = document.getElementById("command").value
            document.getElementById("command").value = ""
            run(code)
        }
    }
}

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

let levels = []

levels.push({
    task: "If you're not using a QWERTY keyboard, you can set your keyboard layout like this: <code>loadkeys de</code>. To find the first solution, read the file called <b>readme</b>.",
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
})

levels.push({
    task: "Read the file called <b>-</b>.",
    setup: "echo FLAG > -",
    tools: ["ls", "cat"],
    google: ["filename with dash"],
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
    task: "Find the file in the Git repository <b>repo</b> that was deleted in the last commit",
    setup: `mkdir repo
                    cd repo
                    git config --global init.defaultBranch main
                    git config --global user.name 'Me'
                    git config --global user.email 'test@example.com'
                    git init
                    echo FLAG > flag
                    echo "The flag was deleted, ha ha! >:}" > this_is_not_the_flag
                    git add .
                    git commit -m 'Add flag'
                    git rm flag
                    git commit -m 'Delete flag'
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

let currentLevel = -1

async function nextLevel() {
    currentLevel = (currentLevel + 1) % levels.length
    await loadLevel(currentLevel)
}

async function prevLevel() {
    currentLevel = (currentLevel - 1 + levels.length) % levels.length
    await loadLevel(currentLevel)
}

async function loadLevel(i) {
    let level = levels[i]

    await run("cd /root")
    //await run("rm -rf .* *")

    if (level.solution) {
        level["flag"] = await run(level.solution)
    } else {
        level["flag"] = await run("date | md5sum | cut -d' ' -f1")
    }

    if (level.setup) {
        await run(level.setup.replaceAll("FLAG", level["flag"]))
    }

    document.getElementById("title").innerHTML = "Level " + (currentLevel + 1)
    document.getElementById("description").innerHTML =
        "<p>" + level.task + "</p>"
    if (level.tools) {
        document.getElementById("description").innerHTML +=
            "<h3>Useful tools:</h3>"
        for (let tool of level.tools) {
            // link to https://man7.org/linux/man-pages/man1/TOOL.1.html
            document.getElementById(
                "description"
            ).innerHTML += `<a href="https://man7.org/linux/man-pages/man1/${tool}.1.html" target="_blank">${tool}</a> `
        }
    }
    if (level.google) {
        document.getElementById("description").innerHTML +=
            "<h3>Helpful Google searches:</h3>"
        for (let query of level.google) {
            document.getElementById(
                "description"
            ).innerHTML += `<a href="https://www.google.com/search?q=${query}" target="_blank">${query}</a> `
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
        alert("Correct :)")
        await nextLevel()
    } else {
        alert("Wrong flag")
    }
}
