use std::collections::HashSet;

use petgraph::{graphmap::DiGraphMap, prelude::*, visit::Walker as _};

use super::{TokenForUi, TroutId};

pub type Ancestors = DiGraphMap<TroutId, ()>;

pub fn make_graph(tokens: impl Iterator<Item = TokenForUi>) -> Ancestors {
    let mut g = DiGraphMap::new();
    for token in tokens {
        let this = TroutId {
            chain_id: 23294,
            token_id: token.id,
        };
        g.add_node(this);
        if let Some((left, right)) = token.parents {
            g.add_edge(this, left, ());
            g.add_edge(this, right, ());
        }
    }
    g
}

fn get_common_ancestors(
    graph: &DiGraphMap<TroutId, ()>,
    parent1: TroutId,
    parent2: TroutId,
) -> HashSet<TroutId> {
    // Create BFS iterators for each parent.
    let bfs_parent1 = Bfs::new(graph, parent1);
    let bfs_parent2 = Bfs::new(graph, parent2);

    // Collect all ancestors for each parent in HashSets.
    let ancestors_parent1: HashSet<_> = bfs_parent1.iter(graph).collect();
    let ancestors_parent2: HashSet<_> = bfs_parent2.iter(graph).collect();

    // Get the intersection of both HashSets to find common ancestors.
    ancestors_parent1
        .intersection(&ancestors_parent2)
        .cloned()
        .collect()
}

fn find_path(graph: &DiGraphMap<TroutId, ()>, start: TroutId, end: TroutId) -> Vec<Vec<TroutId>> {
    let mut paths: Vec<Vec<TroutId>> = Vec::new();
    let mut visited: HashSet<TroutId> = HashSet::new();

    // Recursive DFS function
    fn dfs(
        graph: &DiGraphMap<TroutId, ()>,
        start: TroutId,
        end: TroutId,
        path: &mut Vec<TroutId>,
        paths: &mut Vec<Vec<TroutId>>,
        visited: &mut HashSet<TroutId>,
    ) {
        path.push(start);
        visited.insert(start);

        if start == end {
            paths.push(path.clone());
        } else {
            for neighbor in graph.neighbors_directed(start, Outgoing) {
                if !visited.contains(&neighbor) {
                    dfs(graph, neighbor, end, path, paths, visited);
                }
            }
        }

        path.pop();
        visited.remove(&start);
    }

    // Actual DFS call
    let mut path: Vec<TroutId> = Vec::new();
    dfs(graph, start, end, &mut path, &mut paths, &mut visited);

    paths
}

pub fn inbreeding(graph: &DiGraphMap<TroutId, ()>, target: TroutId) -> f64 {
    let mut parents = graph.neighbors_directed(target, Outgoing);
    let parent1 = match parents.next() {
        Some(p) => p,
        None => return 0.0,
    };
    let parent2 = match parents.next() {
        Some(p) => p,
        None => return 0.0,
    };
    assert!(parents.next().is_none(), "3 parents?");

    // 1: Identify common ancestors.
    let common_ancestors = get_common_ancestors(graph, parent1, parent2);

    // 2: Determine the inbreeding path.
    let mut sum_inbreeding_paths = 0.0;

    for &ancestor in &common_ancestors {
        // 3a. get the paths to the common ancestor
        let paths_parent1 = find_path(graph, parent1, ancestor);
        let paths_parent2 = find_path(graph, parent2, ancestor);

        // 3b. get the shortest path from all possible paths
        let empty = vec![];
        let shortest_parent1 = paths_parent1
            .iter()
            .min_by_key(|vec| vec.len())
            .unwrap_or(&empty);
        let shortest_parent2 = paths_parent2
            .iter()
            .min_by_key(|vec| vec.len())
            .unwrap_or(&empty);

        let (n_parent1, m_parent2) = (shortest_parent1.len() - 1, shortest_parent2.len() - 1);

        // Step 4: calculate the inbreeding coefficient by summing up (1/2)^(n+m+1) for each path
        let path_inbreeding_value = 0.5f64.powf((n_parent1 + m_parent2 + 1) as f64);

        sum_inbreeding_paths += path_inbreeding_value;
    }

    sum_inbreeding_paths
}
