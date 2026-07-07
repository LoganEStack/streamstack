from sqlmodel import Session
from app.database import engine, create_db_and_tables
from app.models import Video, generate_unique_public_id

create_db_and_tables()

video_data = [
    {
        "media_slug": "big-buck-bunny",
        "title": "Big Buck Bunny",
        "description": "A giant rabbit deals with three bullying rodents, until he decides to strike back.",
        "thumbnail_url": "/thumbnails/bbb.jpg",
    },
    {
        "media_slug": "sample-2",
        "title": "Sample Video 2",
        "description": "Placeholder second catalog entry for testing multi-title playback.",
        "thumbnail_url": "/thumbnails/sample2.jpg",
    },
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