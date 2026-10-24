LC.lesson({
  "id": "build-setup",
  "title": "Lab 0: Set up your home lab",
  "track": "build",
  "minutes": 45,
  "level": 2,
  "prereqs": [
    "ign-install"
  ],
  "tags": [
    "lab",
    "maker-edition",
    "docker",
    "postgresql",
    "simulator",
    "setup"
  ],
  "summary": "Build the lab every other build lesson uses: a Maker Edition Gateway, a simulated PLC named PLC1, a database connection and an empty Meridian Perspective project.",
  "objectives": [
    "Install Ignition Maker Edition natively or from the official Docker image",
    "Run a PostgreSQL container and connect the Gateway to it",
    "Add a Programmable Device Simulator named PLC1",
    "Create the Meridian project and the Plant1/Area10/Line1 tag folders",
    "Take a baseline Gateway backup"
  ],
  "body": "\nThis lab gets you a working Ignition lab on your own machine: a Gateway, a simulated PLC, a database and an empty Perspective project, all named the way Meridian Foods names things. Every later lab assumes this exact setup, so it is worth ten extra minutes now. Keep the one-page [naming sheet](content/files/meridian-naming-sheet.md) open while you work.\n\n> [!warning] Maker Edition is for learning only\n> Ignition Maker Edition is free but licensed for personal, non-commercial use. It is not for industrial, professional or commercial use, and it is not for sales demos. It is a single, independent Gateway with no redundancy, and Inductive Automation offers no phone or email support for it. Vendor pages list limits on tags and sessions that may change between versions, so check the current Maker Edition page. Never point this lab at a real plant.\n\n## What you are building\n\n{{diagram:lab}}\n\nTwo containers or services on one PC. The Gateway talks to a simulated PLC inside itself (the simulator is a device driver, so no network is involved) and to a database over JDBC. Your browser talks to the Gateway on port 8088.\n\n| Piece | Lab name | Why this name |\n|---|---|---|\n| Gateway | `meridian-lab` | Shows in the Gateway status and in backups |\n| Device | `PLC1` | Matches the PLC1 in the plant plan, and the UDT `PLC` parameter later |\n| Tag provider | `default` | Every example path starts with `[default]` |\n| Database connection | `meridian_db` | Used by the historian, alarm journal and the OEE lab |\n| Project | `Meridian` | One project holds the whole lab |\n\n## Part 1: Install the Gateway\n\nPick **one** of the two routes. Both end at the same Gateway web page.\n\n### Route A: native install of Maker Edition\n\n1. Download the current 8.3 installer for your operating system from Inductive Automation's site. The installation guide walks through this; the wizard offers the editions, so choose Maker Edition.\n2. Run the installer. Accept the default modules for now. You can add modules later from the Gateway.\n3. Create a free Inductive Automation account if you do not have one, and generate a Maker license key and activation token there. Activation takes a license key and a longer activation token, both from your account page.\n4. Open `http://localhost:8088` in a browser. The first visit starts the commissioning wizard.\n\n### Route B: the official Docker image\n\nThe official image is `inductiveautomation/ignition` on Docker Hub, with tags such as `8.3` for the latest 8.3.x release. Gateway data lives at `/usr/local/bin/ignition/data` inside the container (see {{lesson:arch-containers}}), so mount a volume there or you will lose your work when the container is removed. The next part adds the database to the same compose file.\n\n## Part 2: Add a database container\n\nYou need a real SQL database for the historian, the alarm journal and the OEE lab. PostgreSQL is the default in these labs. MariaDB works the same way with different port, driver and URL.\n\nCreate a folder `meridian-lab` with a file `compose.yaml`. This is a starting point, not an official example. The official docs show a single-gateway compose file, so read the image page for the exact environment variables your tag supports.\n\n```yaml\nservices:\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_DB: meridian\n      POSTGRES_USER: ignition\n      POSTGRES_PASSWORD: change-me-lab-only\n    ports: [\"5432:5432\"]\n    volumes: [\"dbdata:/var/lib/postgresql/data\"]\n  Gateway:\n    image: inductiveautomation/ignition:8.3\n    hostname: meridian-lab\n    depends_on: [db]\n    ports: [\"8088:8088\"]\n    environment:\n      ACCEPT_IGNITION_EULA: \"Y\"\n      GATEWAY_ADMIN_USERNAME: admin\n      GATEWAY_ADMIN_PASSWORD: change-me-lab-only\n      IGNITION_EDITION: maker\n      # Maker also needs your license key and activation token.\n      # Check the image page for the variable names in your tag.\n    volumes: [\"gwdata:/usr/local/bin/ignition/data\"]\nvolumes:\n  dbdata:\n  gwdata:\n```\n\nRun `docker compose up -d`. Inside the compose network the Gateway reaches the database by service name, so the host in the JDBC URL is `db`, not `localhost`. If you installed the Gateway natively and only ran the database in Docker, the host is `localhost`.\n\n> [!tip] Passwords\n> Lab passwords go in the compose file because this stack lives on your laptop. For anything shared, use secrets or an environment file that is not committed. See {{lesson:ign-security}}.\n\n## Part 3: Commission the Gateway\n\nOpen `http://localhost:8088`. The commissioning flow asks you to accept the license agreement, create an admin user, and choose ports. Keep the defaults (HTTP 8088, HTTPS 8043). Docker users who passed the admin variables may skip some of these steps.\n\nThen name the Gateway. In the Gateway web page, the system or Gateway settings area has a Gateway name field. Set it to `meridian-lab`. In 8.3 the exact menu names may differ slightly from older versions, so look for \"Gateway Settings\" or \"System\".\n\nYou should see: the Gateway status page with the Maker Edition license shown as activated, and the name `meridian-lab` in the header.\n\n## Part 4: Add the simulated PLC\n\nThe Programmable Device Simulator is a device driver that runs a small program of timed instructions. It needs no IP address because it is not on the network.\n\n1. On the Gateway, go to **Connections > Devices > Connections** (in 8.1: Config > OPC UA > Device Connections).\n2. Click **Create Device Connection** and choose the Programmable Device Simulator.\n3. Name it `PLC1`. Leave the base rate and repeat settings at their defaults.\n4. Save. The device should show a status of Running.\n\nEach instruction in the simulator program has a time interval, a browse path, a value source (static value or a function) and a data type. You will write the real program in {{lesson:build-motor-udt}}. For now, confirm it works: open the Designer later and look for `PLC1` in the OPC Connections tab of the tag browser. The simulator also exposes control tags to pause, repeat and reset the program. Changes to those control tags do not survive a restart.\n\n## Part 5: Add the database connection\n\n1. On the Gateway, go to **Connections > Databases > Connections**.\n2. Create a connection. Choose the PostgreSQL driver (or MariaDB).\n3. Name it `meridian_db`.\n4. Connect URL: `jdbc:postgresql://db:5432/meridian` (Docker) or `jdbc:postgresql://localhost:5432/meridian` (native).\n5. Username `ignition`, password as in the compose file.\n6. Save. The status should read Valid.\n\nIf it says Faulted, read the message. The usual causes are covered below. A database that is not reachable is the most common first failure in this lab, and it is a good place to practise reading the error and not the symptom. See {{lesson:ign-databases}} for how the connection pool behaves.\n\n## Part 6: Create the Perspective project and a tag folder skeleton\n\n1. Download the Designer launcher from the Gateway home page, install it, open it and log in.\n2. Create a new project named `Meridian`. Enable Perspective for the project.\n3. In the Tag Browser, under the `default` provider, create folders: `Plant1`, inside it `Area10`, inside it `Line1`. These are the ISA-95 levels from the naming sheet.\n4. In the Project Browser, create a Perspective view folder named `Faceplates`.\n5. Save the project (Save is Ctrl+S in the Designer).\n\n> [!note] In 8.1\n> The Designer launcher and the commissioning wizard look different, and the device menu is called \"OPC UA > Device Connections\" in the config sidebar. The steps and names are otherwise the same.\n\n## Part 7: Take a baseline backup\n\nBack up the Gateway now, while it is empty and correct. In the Gateway Config area, find the backup option and download a .gwbk file named for the lab, such as `meridian-lab-lab0.gwbk`. If a later lab goes wrong you can restore this and replay only that lab. See {{lesson:ign-versioning}}.\n\n## Common mistakes\n\n- **Using `localhost` as the database host inside Docker.** Inside the Gateway container, `localhost` is the Gateway itself. Use the service name `db`.\n- **No volume on the Gateway data path.** Without it, `docker compose down` removes your project.\n- **Naming the device something other than `PLC1`.** Later labs use `PLC1` as the UDT `PLC` parameter. A different name works if you change the parameter, but expect confusion.\n- **Skipping the license step and watching the trial timer.** Maker Edition needs activation. A Gateway without a license runs in trial mode.\n- **Port conflicts.** If 5432 or 8088 is taken, change the left-hand number in the `ports` mapping and keep the right-hand number.\n\n## What you have now\n\nA Gateway named `meridian-lab`, a device `PLC1`, a database connection `meridian_db` with a Valid status, a `Meridian` project and an empty `Plant1/Area10/Line1` tag folder. Next, in {{lesson:build-motor-udt}}, you define the motor.\n",
  "checklist": [
    "Gateway reachable at http://localhost:8088 and Maker Edition license shown as activated",
    "Gateway named meridian-lab",
    "Database container running and reachable from the Gateway",
    "Database connection meridian_db shows Valid",
    "Programmable Device Simulator device named PLC1 shows Running",
    "Designer launcher installed and opened against the Gateway",
    "Project Meridian created with Perspective enabled",
    "Tag folders Plant1/Area10/Line1 exist under the default provider",
    "Perspective view folder Faceplates exists",
    "Baseline .gwbk backup downloaded",
    "Compose file or install notes saved next to the naming sheet"
  ],
  "eli5": "\nThink of a model railway. Before you can run trains, you need a table, a track, a power supply and a little town to drive past. None of that is the trains, but without it there is nowhere to put them.\n\nThis lab builds the table. The Gateway is the control box with the power switch. The simulated PLC is a toy train driver that follows a script, so you can practise without a real factory. The database is a notebook where everything gets written down. The project is an empty screen waiting for pictures.\n\nGiving everything the same names as the real plant (the same station names on your model railway) means the lessons that follow can say \"go to PLC1\" and everyone, including you in six months, knows what that means.\n",
  "why": "\n**Why a simulator and not a real PLC?** The point of the labs is the Ignition side: UDTs, bindings, alarms, history. A simulator gives you repeatable data with no hardware and no risk. It also exercises the same OPC UA path as a real device, so the tag paths you build are the ones you would use against a Logix controller, with only the device name changing.\n\n**Why a real database and not the built-in options?** The historian, alarm journal and OEE tables all depend on SQL, and the SQL skills transfer to every plant. A tiny PostgreSQL container costs nothing and lets you look at the raw rows, which is how you learn what the historian is actually doing.\n\n**Why Docker, if the install is three clicks?** Containers let you throw the lab away and rebuild it from one file, and they are how many integrators run Gateways in production now. The tradeoff is one more tool to learn and a few networking surprises, such as the `localhost` trap. Integrators argue about whether production Gateways belong in containers. For a learning lab the reproducibility wins.\n\n**Why fix the names before building?** Renaming a tag provider, a device or a database connection after screens and bindings exist means touching every one of them. The house standard exists so that these names are decided once.\n",
  "history": "\nIgnition Maker Edition arrived during the 8.x line (check the release notes for the exact version) as a free edition for hobbyists and learners. Before that, learners relied on the 2-hour trial timer that reset when you restarted. The Programmable Device Simulator replaced the older Generic, Dairy and SLC simulators in an 8.0 release (check the release notes for the exact version).\n",
  "diagrams": {
    "lab": "<svg viewBox=\"0 0 640 220\" role=\"img\" aria-label=\"Browser connects to the Gateway on port 8088; the Gateway contains the PLC1 simulator and connects to PostgreSQL on port 5432\"><defs><marker id=\"build-setup-ah\" markerWidth=\"10\" markerHeight=\"8\" refX=\"9\" refY=\"4\" orient=\"auto\"><path class=\"dg-fill-line\" d=\"M0,0 L10,4 L0,8 z\"/></marker></defs><rect class=\"dg-box\" x=\"20\" y=\"80\" width=\"110\" height=\"60\" rx=\"6\"/><text class=\"dg-text dg-mid\" x=\"75\" y=\"108\">Browser</text><text class=\"dg-text-sm dg-mid\" x=\"75\" y=\"126\">Designer</text><rect class=\"dg-box-accent\" x=\"220\" y=\"30\" width=\"220\" height=\"160\" rx=\"6\"/><text class=\"dg-title\" x=\"240\" y=\"56\">Gateway meridian-lab</text><rect class=\"dg-box\" x=\"240\" y=\"74\" width=\"180\" height=\"44\" rx=\"4\"/><text class=\"dg-text-sm dg-mid\" x=\"330\" y=\"101\">Simulator PLC1</text><rect class=\"dg-box\" x=\"240\" y=\"130\" width=\"180\" height=\"44\" rx=\"4\"/><text class=\"dg-text-sm dg-mid\" x=\"330\" y=\"157\">Tags + Project Meridian</text><rect class=\"dg-box\" x=\"520\" y=\"80\" width=\"100\" height=\"60\" rx=\"6\"/><text class=\"dg-text dg-mid\" x=\"570\" y=\"108\">Postgres</text><text class=\"dg-text-sm dg-mid\" x=\"570\" y=\"126\">meridian_db</text><line class=\"dg-line\" x1=\"130\" y1=\"110\" x2=\"218\" y2=\"110\" marker-end=\"url(#build-setup-ah)\"/><text class=\"dg-text-sm\" x=\"140\" y=\"100\">8088</text><line class=\"dg-line\" x1=\"440\" y1=\"110\" x2=\"518\" y2=\"110\" marker-end=\"url(#build-setup-ah)\"/><text class=\"dg-text-sm\" x=\"456\" y=\"100\">5432</text></svg>"
  },
  "pitfalls": [
    "Using localhost as the database host from inside the Gateway container.",
    "Running the Gateway container without a volume on its data path, then losing the project.",
    "Naming the simulator device something other than PLC1 and forgetting the UDT parameter later.",
    "Treating a Maker Edition lab as something you can show customers or run in a plant.",
    "Leaving default or shared passwords on a database port exposed beyond your PC."
  ],
  "keyTerms": [
    "ign-maker-edition",
    "ign-docker",
    "docker-compose",
    "docker-volume",
    "postgresql",
    "ign-device-connection",
    "jdbc",
    "gateway-backup"
  ],
  "quiz": [
    {
      "q": "Your Gateway runs in a container and the database in another container from the same compose file. What host belongs in the JDBC URL?",
      "options": [
        "localhost",
        "The Docker host's public IP",
        "127.0.0.1:8088",
        "The database service name, such as db"
      ],
      "answer": 3,
      "explain": [
        "Inside the Gateway container, localhost is the Gateway container itself, so the connection fails.",
        "That could work through published ports but couples the lab to your network and breaks when the IP changes.",
        "8088 is the Gateway's own web port, not a database address.",
        "Correct. Compose gives each service a DNS name on the shared network, so the Gateway finds the database by service name."
      ]
    },
    {
      "q": "Why do we mount a volume on /usr/local/bin/ignition/data?",
      "options": [
        "It makes the Gateway start faster",
        "Project and config data live there, so removing the container would otherwise delete the lab",
        "Docker requires every container to have a volume",
        "It enables the Maker license"
      ],
      "answer": 1,
      "explain": [
        "Startup speed is not what a volume is for.",
        "Correct. The container filesystem is disposable. Data you want to keep must live in a volume.",
        "Docker does not require volumes. You choose where state lives.",
        "Licensing is activated with a key and token, not a volume."
      ]
    },
    {
      "q": "Why does the lab use a simulator device instead of a spare real PLC?",
      "options": [
        "It needs no hardware and still exercises the same OPC UA tag path, so what you build transfers",
        "The simulator is faster than any real PLC",
        "Real PLCs cannot be read by Ignition Maker Edition",
        "The simulator is the only way to get quality codes"
      ],
      "answer": 0,
      "explain": [
        "Correct. The tags you build refer to a device name and an item path, exactly as they would for a Logix device.",
        "Speed is not the reason.",
        "Maker Edition can use real device drivers. The simulator is chosen for convenience.",
        "Quality codes come from any OPC connection."
      ]
    },
    {
      "q": "You rename the device from PLC1 to Sim1 after building tags. What is the likely result?",
      "options": [
        "Nothing, Ignition updates every path automatically",
        "The database connection fails",
        "Tags that point at the old device show bad quality until their item paths are updated",
        "The project is deleted"
      ],
      "answer": 2,
      "explain": [
        "Tag OPC item paths store the device name as text. They do not track renames.",
        "The database connection is independent of device names.",
        "Correct. This is why names are fixed before building.",
        "Renaming a device does not touch projects."
      ]
    },
    {
      "q": "Why take a backup right after setup?",
      "options": [
        "Backups are required by the license",
        "It gives you a clean, known-good restore point to replay a later lab",
        "It makes the Gateway faster",
        "It stops the trial timer"
      ],
      "answer": 1,
      "explain": [
        "The license does not require backups.",
        "Correct. A baseline lets you recover from a bad edit without redoing the setup.",
        "Backups do not affect performance.",
        "Activation handles the license, not a backup."
      ]
    }
  ],
  "resources": [
    {
      "title": "Ignition Maker Edition",
      "url": "https://inductiveautomation.com/ignition/maker-edition",
      "type": "article",
      "source": "Inductive Automation"
    },
    {
      "title": "Downloading and Installing Ignition (8.3)",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/startup-guide/downloading-and-installing-ignition",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "inductiveautomation/ignition on Docker Hub",
      "url": "https://hub.docker.com/r/inductiveautomation/ignition",
      "type": "tool",
      "source": "Docker Hub"
    },
    {
      "title": "Docker Image Examples (8.3)",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/platform/docker-image/docker-image-examples",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Programmable Device Simulator",
      "url": "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/opc-ua/opc-ua-drivers/programmable-device-simulator",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Connecting to the Device Simulator",
      "url": "https://inductiveuniversity.com/video/connecting-to-the-device-simulator/8.0",
      "type": "video",
      "source": "Inductive University"
    }
  ]
});
