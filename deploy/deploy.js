const func = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();
    console.log("Deploying contracts with the account:", deployer);

    try {
        const watchersRingContract = await deploy('WatchersRing', {
            from: deployer,
            args: [
                ""
            ],
            log: true,
            gasPrice: 30000000000
        });

        const runiverseItemMinterContract = await deploy('WatchersRingMinter', {
            from: deployer,
            args: [
                watchersRingContract.address
            ],
            log: true,
            gasPrice: 30000000000
        });
    } catch (error) {
        console.error("Error deploying contracts:", error);
    }
};

module.exports = func;
func.tags = ['WatchersRing'];
