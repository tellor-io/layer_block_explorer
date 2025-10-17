#!/bin/bash

# Layer Block Explorer - Node Monitoring Script
# This script monitors the server logs and node activity

echo "🔍 Layer Block Explorer - Node Monitoring Started"
echo "=================================================="
echo "Server running on: http://localhost:3000"
echo "Monitoring dashboard: http://localhost:3000/monitoring"
echo "Metrics endpoint: http://localhost:3000/api/metrics"
echo ""

# Function to check server status
check_server_status() {
    if curl -s http://localhost:3000/api/metrics > /dev/null 2>&1; then
        echo "✅ Server is running and responding"
        return 0
    else
        echo "❌ Server is not responding"
        return 1
    fi
}

# Function to get current metrics
get_metrics() {
    echo "📊 Current Metrics:"
    curl -s http://localhost:3000/api/metrics 2>/dev/null | jq -r '
        "GraphQL Queries: " + (.summary.graphql.totalQueries | tostring) + 
        " (Success: " + (.summary.graphql.successfulQueries | tostring) + 
        ", Failed: " + (.summary.graphql.failedQueries | tostring) + ")" +
        "\nRPC Queries: " + (.summary.rpc.totalQueries | tostring) + 
        " (Success: " + (.summary.rpc.successfulQueries | tostring) + 
        ", Failed: " + (.summary.rpc.failedQueries | tostring) + ")" +
        "\nAverage Response Time: " + (.summary.overall.averageResponseTime | tostring) + "ms" +
        "\nError Rate: " + (.summary.overall.errorRate | tostring) + "%" +
        "\nFallback Rate: " + (.summary.overall.fallbackRate | tostring) + "%"
    ' 2>/dev/null || echo "Failed to fetch metrics"
}

# Function to get latest block info
get_latest_block() {
    echo "🔗 Latest Block Information:"
    curl -s http://localhost:3000/api/latest-block 2>/dev/null | jq -r '
        "Block Height: " + (.blocks.edges[0].node.blockHeight | tostring) +
        "\nBlock Time: " + (.blocks.edges[0].node.blockTime | tostring) +
        "\nChain ID: " + (.blocks.edges[0].node.chainId | tostring) +
        "\nNumber of Transactions: " + (.blocks.edges[0].node.numberOfTx | tostring)
    ' 2>/dev/null || echo "Failed to fetch latest block"
}

# Function to get validator info
get_validator_info() {
    echo "👥 Validator Information:"
    curl -s http://localhost:3000/api/validators 2>/dev/null | jq -r '
        .validators.edges[0:3] | .[] | 
        "Validator: " + .node.description.moniker + 
        " (Status: " + .node.bondStatus + 
        ", Jailed: " + (.node.jailed | tostring) + 
        ", Tokens: " + .node.tokens + 
        ", Missed Blocks: " + (.node.missedBlocks | tostring) + ")"
    ' 2>/dev/null || echo "Failed to fetch validator info"
}

# Main monitoring loop
echo "Starting continuous monitoring (Press Ctrl+C to stop)..."
echo ""

while true; do
    echo "🕐 $(date '+%Y-%m-%d %H:%M:%S') - Node Activity Check"
    echo "--------------------------------------------------"
    
    if check_server_status; then
        echo ""
        get_metrics
        echo ""
        get_latest_block
        echo ""
        get_validator_info
        echo ""
        echo "🔄 Waiting 30 seconds for next check..."
        echo "=================================================="
        sleep 30
    else
        echo "❌ Server not responding, waiting 10 seconds before retry..."
        sleep 10
    fi
done
