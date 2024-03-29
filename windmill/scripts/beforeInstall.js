var resp = {
    result: 0,
    nodes: []
};

const isProd = '${settings.deploymentType}' == 'production';
const nodeCount = isProd ? 2 : 1;
const DB_HOST = isProd ? "pgpool" : "postgresql";
const DB_PASSWORD = '${globals.dbPassword}';
const DATABASE_URL = "postgres://windmill:" + DB_PASSWORD + "@" + DB_HOST + ":5432/windmill";
const DOCKER_REGISTRY = "ghcr.io";
const DOCKER_USER = "windmill-labs";
const DOCKER_IMAGE = DOCKER_REGISTRY + "/" + DOCKER_USER + "/windmill:" + "${settings.tag}";
const DOCKER_IMAGE_LSP = DOCKER_REGISTRY + "/" + DOCKER_USER + "/windmill-lsp:" + "${settings.tagLsp}";
const CP_LINKS = [
    "pgpool:pgpool",
    "sqldb:postgresql"
];

// Server node configuration
const serverConfig = {
    nodeType: "docker",
    displayName: "Server",
    count: nodeCount,
    env: {
        DATABASE_URL: DATABASE_URL,
        MODE: "server",
        JSON_FMT: "true",
    },
    image: DOCKER_IMAGE,
    cloudlets: 8,
    diskLimit: 10,
    scalingMode: 'STATELESS',
    isSLBAccessEnabled: false,
    nodeGroup: "cp",
    links: CP_LINKS,
    startServiceOnCreation: false
}
resp.nodes.push(serverConfig);

// Worker node configuration
const defaultWorkerConfig = {
    nodeType: "docker",
    displayName: "Default Worker",
    count: '${settings.workerDefault}',
    env: {
        DATABASE_URL: DATABASE_URL,
        MODE: "worker",
        WORKER_GROUP: "default",
        JSON_FMT: "true",
    },
    image: DOCKER_IMAGE,
    volumes: [
        "/tmp/windmill/cache"
    ],
    volumeMounts: {
        "/tmp/windmill/cache": {
            protocol: "NFS",
            sourcePath: "/data/windmill/cache",
            sourceNodeGroup: "storage",
            sourceAddressType: ""
        }
    },
    cloudlets: 8,
    diskLimit: 10,
    scalingMode: 'STATELESS',
    isSLBAccessEnabled: false,
    nodeGroup: "cp2",
    links: CP_LINKS,
    startServiceOnCreation: false
};
resp.nodes.push(defaultWorkerConfig);

const nativeWorkerConfig = {
    nodeType: "docker",
    displayName: "Native Worker",
    count: '${settings.workerNative}',
    env: {
        DATABASE_URL: DATABASE_URL,
        MODE: "worker",
        WORKER_GROUP: "native",
        JSON_FMT: "true",
    },
    image: DOCKER_IMAGE,
    volumes: [
        "/tmp/windmill/cache"
    ],
    volumeMounts: {
        "/tmp/windmill/cache": {
            protocol: "NFS",
            sourcePath: "/data/windmill/cache",
            sourceNodeGroup: "storage",
            sourceAddressType: ""
        }
    },
    cloudlets: 8,
    diskLimit: 10,
    scalingMode: 'STATELESS',
    isSLBAccessEnabled: false,
    nodeGroup: "cp3",
    links: CP_LINKS,
    startServiceOnCreation: false
};
resp.nodes.push(nativeWorkerConfig);

const reportWorkerConfig = {
    nodeType: "docker",
    displayName: "Report Worker",
    count: '${settings.workerReport}',
    env: {
        DATABASE_URL: DATABASE_URL,
        MODE: "worker",
        WORKER_GROUP: "reports",
        JSON_FMT: "true",
    },
    image: DOCKER_IMAGE,
    volumes: [
        "/tmp/windmill/cache"
    ],
    volumeMounts: {
        "/tmp/windmill/cache": {
            protocol: "NFS",
            sourcePath: "/data/windmill/cache",
            sourceNodeGroup: "storage",
            sourceAddressType: ""
        }
    },
    cloudlets: 8,
    diskLimit: 10,
    scalingMode: 'STATELESS',
    isSLBAccessEnabled: false,
    nodeGroup: "cp4",
    links: CP_LINKS,
    startServiceOnCreation: false
};
resp.nodes.push(reportWorkerConfig);

// LSP node configuration
if ('${settings.lspEnabled}' == 'true') {
    const lspConfig = {
        nodeType: "docker",
        displayName: "LSP",
        count: 1,
        env: {
            JELASTIC_EXPOSE: "3001",
        },
        image: DOCKER_IMAGE_LSP,
        cloudlets: 8,
        diskLimit: 10,
        scalingMode: 'STATELESS',
        isSLBAccessEnabled: false,
        nodeGroup: "cp5",
        volumes: [
            "/root/.cache"
        ]
    };
    resp.nodes.push(lspConfig);
}

// PostgreSQL node configuration
const pgsqlConfig = {
    nodeType: "postgresql",
    count: isProd ? 2 : 1,
    cloudlets: isProd ? 16 : 32,
    diskLimit: `${settings.dbDiskLimit}`,
    scalingMode: "STATELESS",
    isSLBAccessEnabled: false,
    nodeGroup: "sqldb",
    displayName: isProd ? "PostgreSQL Cluster" : "PostgreSQL",
    tag: "15.5"
};
if (isProd) {
    pgsqlConfig.cluster = {is_pgpool2: true};
}
resp.nodes.push(pgsqlConfig);

// Storage node configuration
const storageConfig = {
    nodeType: "storage",
    count: isProd ? 3 : 1,
    restartDelay: 30,
    cloudlets: 8,
    diskLimit: `${settings.storageDiskLimit}`,
    scalingMode: "STATELESS",
    isSLBAccessEnabled: false,
    nodeGroup: "storage",
    displayName: "Storage"
};

if (isProd) {
    storageConfig.cluster = {
        replicatedPath: "/data",
        replicatedVolume: "data"
    };
}

resp.nodes.push(storageConfig);

// Nginx node configuration
const nginxConfig = {
    nodeType: "nginx-dockerized",
    count: nodeCount,
    cloudlets: 8,
    diskLimit: 10,
    scalingMode: isProd ? "STATEFUL" : "STATELESS",
    isSLBAccessEnabled: true,
    nodeGroup: "bl",
    displayName: "Load Balancer",
    extip: isProd
};

if ('${settings.lspEnabled}' == 'true') {
    nginxConfig.links = [
        'cp5:lsp'
    ]
}
resp.nodes.push(nginxConfig);
resp.ssl = !isProd;
return resp;