use rand::Rng as _;

use super::*;

fn test_cid() -> Cid {
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| rng.sample(rand::distributions::Alphanumeric) as char)
        .collect::<String>()
        .into()
}

fn test_trout_id() -> TroutId {
    TroutId {
        chain_id: 31337,
        token_id: rand::random(),
    }
}

fn test_token() -> TroutToken {
    TroutToken {
        cid: test_cid(),
        meta: crate::nftrout::TroutMetadata {
            description: "A test trout is for testing".into(),
            image: test_cid(),
            metadata: test_cid(),
            name: "Test TROUT".into(),
            properties: crate::nftrout::TroutProperties {
                version: 1,
                generations: vec![test_cid(), test_cid()],
                left: None,
                right: None,
                self_id: test_trout_id(),
                attributes: crate::nftrout::TroutAttributes {
                    genesis: rand::random(),
                    santa: rand::random(),
                },
            },
        },
    }
}

#[test]
fn token_cid() {
    let db = Db::open_in_memory().unwrap();
    db.with_conn(|mut conn| {
        let tt1 = test_token();
        let tt2 = test_token();

        conn.insert_tokens(&[tt1.clone(), tt2.clone()])?;

        let tt1_cid_latest = conn.token_cid(&tt1.meta.properties.self_id, None)?;
        assert_eq!(tt1_cid_latest.unwrap(), tt1.cid);

        let tt2_cid_latest = conn.token_cid(&tt2.meta.properties.self_id, None)?;
        assert_eq!(tt2_cid_latest.unwrap(), tt2.cid);

        let tt1_cid_old = conn.token_cid(&tt1.meta.properties.self_id, Some(0))?;
        assert_eq!(tt1_cid_old.unwrap(), tt1.meta.properties.generations[0]);

        assert!(conn.token_cid(&test_trout_id(), None)?.is_none());

        Ok(())
    })
    .unwrap();
}

#[test]
fn duplicate_token() {
    let db = Db::open_in_memory().unwrap();
    db.with_conn(|mut conn| {
        let token = test_token();
        conn.insert_tokens(&[token.clone(), token]).unwrap_err();
        Ok(())
    })
    .unwrap();
}
