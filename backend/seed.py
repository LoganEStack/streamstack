from sqlmodel import Session
from app.database import engine, create_db_and_tables
from app.models import Video, generate_unique_public_id

create_db_and_tables()

video_data = [
    {
        "media_slug": "big-buck-bunny",
        "title": "Big Buck Bunny",
        "description": "A classic in video streaming.",
        "thumbnail_url": "/uploads/big-buck-bunny/big-buck-bunny-thumbnail.jpg",
    },
    {
        "media_slug": "aerial-field-view",
        "title": "Aerial Field View",
        "description": "Aerial view of lush green agriculture fields in a rural countryside setting.",
        "thumbnail_url": "/uploads/aerial-field-view/aerial-field-view-thumbnail.jpg",
    },
    {
        "media_slug": "aerial-waves",
        "title": "Aerial Waves",
        "description": "Aerial view of deep blue waves smashing against a rock formation.",
        "thumbnail_url": "/uploads/aerial-waves/aerial-waves-thumbnail.jpg",
    },
    {
        "media_slug": "globe",
        "title": "Globe",
        "description": "A rendering of planet Earth rotating on its axis.",
        "thumbnail_url": "/uploads/globe/globe-thumbnail.jpg",
    },
    {
        "media_slug": "scientist",
        "title": "Scientist",
        "description": "A scientist shakes a beaker of bright green liquid.",
        "thumbnail_url": "/uploads/scientist/scientist-thumbnail.jpg",
    },
    {
        "media_slug": "wild-goat-grazing",
        "title": "Wild Goat Grazing",
        "description": "A wild goat grazing peacefully in a lush green meadow with yellow flowers.",
        "thumbnail_url": "/uploads/wild-goat-grazing/wild-goat-grazing-thumbnail.jpg",
    }
]

with Session(engine) as session:
    for data in video_data:
        video = Video(public_id=generate_unique_public_id(session), **data)
        session.add(video)
    session.commit()
    print(f"Seeded {len(video_data)} videos.")
    for data in video_data:
        # re-query to print the actual generated IDs
        pass

    from sqlmodel import select
    for video in session.exec(select(Video)).all():
        print(f"  {video.title} -> /v/{video.public_id}")