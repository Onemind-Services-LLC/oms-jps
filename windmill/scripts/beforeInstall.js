var resp = {
    result: 0,
    nodes: []
};

const isProd = '${settings.deploymentType}' == 'production';
const nodeCount = isProd ? 2 : 1;

// PostgreSQL node configuration
const pgsqlConfig = {
    nodeType: "postgresql",
    count: isProd ? 2 : 1,
    cloudlets: isProd ? 16 : 32,
    diskLimit: `${settings.dbDiskLimit}`,
    scalingMode: isProd ? "STATELESS" : "STATEFUL",
    isSLBAccessEnabled: false,
    nodeGroup: "sqldb",
    displayName: isProd ? "PostgreSQL Cluster" : "PostgreSQL"
};
if (isProd) {
    pgsqlConfig.cluster = { is_pgpool2: true };
}
resp.nodes.push(pgsqlConfig);

// Nginx node configuration
const nginxConfig = {
    nodeType: "nginx-dockerized",
    count: nodeCount,
    cloudlets: 8,
    diskLimit: 10,
    scalingMode: isProd ? "STATEFUL" : "STATELESS",
    isSLBAccessEnabled: !isProd,
    nodeGroup: "bl",
    displayName: "Load Balancer"
};
resp.nodes.push(nginxConfig);

return resp;